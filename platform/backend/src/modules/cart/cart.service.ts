import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfiguratorService } from '../configurator/configurator.service';
import { PromotionsService } from '../promotions/promotions.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CouponPreview = {
  couponId: string;
  type: string;
  discountAmount: number;
  freeShipping: boolean;
};

// The cart is always scoped to the authenticated user — get-or-create on first touch.
// Unit prices are never taken from the client: they are recomputed through the configurator
// (which proxies the FastAPI pricing service) at add time and frozen into configSnapshot,
// so the price a buyer saw is the price that later ships (docs/03-configurator-spec.md).
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configurator: ConfiguratorService,
    private readonly promotions: PromotionsService,
  ) {}

  async getCart(userId: string, couponCode?: string) {
    const cart = await this.ensureCart(userId);
    return this.withTotals(cart.id, userId, couponCode ?? null);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const cart = await this.ensureCart(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { subCategory: { include: { category: true } } },
    });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);
    if (!product.active) throw new BadRequestException('Product is not available');

    // CMI-network items are not self-service purchasable — they route through the RFQ flow
    // (docs/06-cmi-partner-routing.md), so they are rejected at the cart boundary.
    if (product.fulfilmentType === 'CMI_PARTNER_NETWORK') {
      throw new BadRequestException('This product is quoted, not purchased online — use Request a Quote');
    }

    const tier = await this.discountTierFor(userId);
    const widthMm = dto.widthMm ?? product.widthMm ?? 0;
    const heightMm = dto.heightMm ?? product.heightMm ?? 0;

    // The pricing service implements the area-rate branch only (FRAME_GLAZED). Sub-categories
    // priced on a different basis (rate-card hardware, extrusion length) use the catalogue's
    // baseCost. A pricing-service failure must not block a sale of a priceable item either —
    // it falls back to the last catalogue price and records which path was taken.
    let unitPrice = Number(product.baseCost);
    let pricedVia: 'PRICING_SERVICE' | 'CATALOGUE_BASE_COST' = 'CATALOGUE_BASE_COST';

    if (product.subCategory.pricingBasis === 'FRAME_GLAZED') {
      try {
        const price = await this.configurator.computePrice({
          productId: product.id,
          widthMm,
          heightMm,
          finishId: dto.finishId ?? '',
          glazingPackageId: dto.glazingPackageId ?? '',
          discountTier: tier,
        });
        unitPrice = this.pickTierPrice(price, tier);
        pricedVia = 'PRICING_SERVICE';
      } catch {
        // Falls through to catalogue baseCost; `pricedVia` records the downgrade.
      }
    }

    const configSnapshot = {
      widthMm,
      heightMm,
      finishId: dto.finishId ?? product.finishId ?? null,
      glazingPackageId: dto.glazingPackageId ?? null,
      pricingBasis: product.subCategory.pricingBasis,
      discountTier: tier,
      pricedVia,
      unitPrice: Number(unitPrice),
    };

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: product.id },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (dto.quantity ?? 1), unitPrice, configSnapshot },
      });
    }

    return this.prisma.cartItem.create({
      data: { cartId: cart.id, productId: product.id, quantity: dto.quantity ?? 1, unitPrice, configSnapshot },
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.ensureCart(userId);
    await this.requireOwnedItem(cart.id, itemId);
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.ensureCart(userId);
    await this.requireOwnedItem(cart.id, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { removed: true };
  }

  /** Cart contents plus a server-verified total; optionally previews a coupon's effect. */
  async withTotals(cartId: string, userId: string, couponCode: string | null) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: { product: { include: { subCategory: { include: { category: true } } } } },
      orderBy: { id: 'asc' },
    });

    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
    let coupon: CouponPreview | null = null;

    if (couponCode) {
      // Coupon math has one owner (promotions) — the cart previews it rather than
      // re-implementing percentage/fixed/free-shipping logic (docs/31-marketing-engine.md).
      coupon = await this.promotions.validateCoupon({ code: couponCode, cartValue: subtotal });
    }

    return {
      items,
      subtotal: this.round(subtotal),
      coupon,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
    };
  }

  private pickTierPrice(price: { retail: number; trade: number; volume: number }, tier: string): number {
    if (tier === 'TRADE') return price.trade;
    if (tier === 'VOLUME') return price.volume;
    return price.retail;
  }

  private async discountTierFor(userId: string): Promise<'RETAIL' | 'TRADE' | 'VOLUME'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: { include: { tradeAccount: true } } },
    });
    const account = user?.company?.tradeAccount;
    if (account?.approved) return account.discountTier as 'TRADE' | 'VOLUME';
    return 'RETAIL';
  }

  private async ensureCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { userId } });
  }

  private async requireOwnedItem(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException(`Cart item ${itemId} not found`);
    return item;
  }

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }
}