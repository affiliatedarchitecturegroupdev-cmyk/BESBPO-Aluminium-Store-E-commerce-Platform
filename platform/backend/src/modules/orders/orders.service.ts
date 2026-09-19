import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CounterService } from '../../prisma/counter.service';
import { CartService } from '../cart/cart.service';
import { PromotionsService } from '../promotions/promotions.service';
import { LegalTaxService } from '../legal-tax/legal-tax.service';
import { CreateOrderDto } from './dto/create-order.dto';

// Checkout turns a cart into an Order atomically. Totals are recomputed here from the
// server-side cart, never trusted from the client. Deliberate rules encoded below:
//
//  * VAT is 15% and is shown as its own line (SARS Tax Invoice requirement).
//  * Made-to-order / CMI custom items are flagged non-returnable — the CPA's cooling-off
//    right does not extend to goods made to a consumer's specification, and a custom
//    window has no resale value (docs/23-legal-tax-compliance.md).
//  * A fragile-handling surcharge applies to glass-bearing lines, from the DeliveryZone
//    band for the destination province.
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: CounterService,
    private readonly cart: CartService,
    private readonly promotions: PromotionsService,
    private readonly legalTax: LegalTaxService,
  ) {}

  // ---- Staff-facing reads -------------------------------------------------

  findAll() {
    return this.prisma.order.findMany({
      include: { items: { include: { product: { select: { name: true, sku: true } } } }, user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, invoice: true, shipment: true, user: { include: { company: true } } },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // ---- Buyer-facing reads -------------------------------------------------

  async findMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: { select: { name: true, sku: true } } } }, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderNumber(userId: string, orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: { include: { product: true } }, invoice: true, shipment: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderNumber} not found`);
    // A buyer may only see their own order — order numbers are guessable, user id check is not.
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    return order;
  }

  // ---- The checkout transaction ------------------------------------------

  async checkout(userId: string, dto: CreateOrderDto) {
    const cart = await this.cart.getCart(userId, dto.couponCode);
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const subtotal = cart.subtotal;
    const discountAmount = cart.coupon ? Number(cart.coupon.discountAmount) : 0;
    const discountedSubtotal = Math.max(subtotal - discountAmount, 0);

    const { deliveryFee, fragileSurcharge } = await this.deliveryCharges(dto.deliveryProvince, cart.items);
    const freeShipping = cart.coupon?.freeShipping === true;
    const effectiveDeliveryFee = freeShipping ? 0 : deliveryFee;

    const vatBase = discountedSubtotal + effectiveDeliveryFee;
    const vatAmount = LegalTaxService.calculateVat(vatBase);
    const total = this.round(vatBase + vatAmount + fragileSurcharge);

    // Fulfilment path is the "slowest" leg of the order: if any line is made-to-order the whole
    // order carries a lead time; CMI network would dominate but self-service never contains it.
    const fulfilmentPath = cart.items.some((i) => i.product.fulfilmentType === 'MADE_TO_ORDER')
      ? 'MADE_TO_ORDER'
      : 'STOCK';

    const orderNumber = await this.nextOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      // Consume the cart *first*, and only proceed if this request actually won the race. The
      // delete is the serialisation point: a second checkout submitted from the same cart (double
      // click, retried request, two tabs) blocks on these row locks, deletes nothing, and is
      // rejected here instead of minting a second order from the same basket.
      const consumed = await tx.cartItem.deleteMany({ where: { cartId: cart.items[0].cartId } });
      if (consumed.count === 0) {
        throw new ConflictException('This cart has already been checked out');
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          fulfilmentPath,
          subtotal,
          vatAmount,
          deliveryFee: effectiveDeliveryFee,
          fragileSurcharge,
          discountAmount,
          couponId: cart.coupon?.couponId ?? null,
          total,
          paymentMethod: dto.paymentMethod as never,
          deliveryAddressId: dto.deliveryAddressId ?? null,
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              configSnapshot: i.configSnapshot ?? undefined,
              unitPrice: i.unitPrice,
              lineTotal: this.round(Number(i.unitPrice) * i.quantity),
              // Custom / made-to-order goods are non-returnable under CPA s20 exceptions.
              nonReturnable: i.product.fulfilmentType !== 'STOCK',
            })),
          },
        },
        include: { items: true },
      });

      if (cart.coupon?.couponId) {
        await tx.coupon.update({
          where: { id: cart.coupon.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    return order;
  }

  /**
   * Marks an order paid and issues its Tax Invoice. Called by the payment-gateway webhook,
   * never by the browser — a client asserting "I paid" is not proof of payment.
   */
  async confirmPayment(orderId: string, paymentRef: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order is already ${order.status}`);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_CONFIRMED', paymentRef },
    });
    const invoice = await this.legalTax.getOrGenerateInvoice(orderId);
    return { order: await this.findOne(orderId), invoice };
  }

  async cancel(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    if (!['PENDING', 'PAYMENT_CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Only unpaid or freshly-paid orders can be cancelled online');
    }
    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  }

  // ---- Internals ----------------------------------------------------------

  private async deliveryCharges(province: string | undefined, items: { product: { glazingSpec: string | null } }[]) {
    const zone = province
      ? await this.prisma.deliveryZone.findFirst({ where: { province: province as never } })
      : null;
    const deliveryFee = zone ? Number(zone.baseFee) : 0;
    const hasGlass = items.some((i) => (i.product.glazingSpec ?? '').trim().length > 0);
    const pct = zone ? Number(zone.fragileSurchargePct) : 0;
    const fragileSurcharge = hasGlass ? this.round(deliveryFee * pct) : 0;
    return { deliveryFee, fragileSurcharge };
  }

  private async nextOrderNumber(): Promise<string> {
    // ALS-YYMMDD-#### — human-quotable on the phone, which matters for a trade counter.
    // Allocated from the atomic counter rather than a same-day row count: two concurrent
    // checkouts counting the same day would otherwise mint the same number, and the second
    // insert would violate the @unique constraint on orderNumber.
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const sequence = await this.counters.next(`order:${stamp}`);
    return `ALS-${stamp}-${String(sequence).padStart(4, '0')}`;
  }

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }
}