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
import { AddressesService } from '../addresses/addresses.service';
import { TradeAccountsService } from '../trade-accounts/trade-accounts.service';
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
    private readonly addresses: AddressesService,
    private readonly tradeAccounts: TradeAccountsService,
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

    // A delivery address id arriving from the browser is a claim, not a fact. Confirm it belongs
    // to the caller before writing it onto the order — otherwise any cuid could be attached and
    // another account's address (name, street, suburb) read back off the order confirmation.
    const address = dto.deliveryAddressId
      ? await this.addresses.findOwned(userId, dto.deliveryAddressId)
      : null;

    // The address is the authoritative source for the province; the free-text field is only a
    // fallback for callers that have no saved address yet.
    const province = address?.province ?? (dto.deliveryProvince as never);
    if (!province) {
      // Delivery zones are province-keyed. Without one the lookup below returns no zone and the
      // fee silently becomes R0 — i.e. free delivery to anyone who omits the field. Fail instead.
      throw new BadRequestException('A delivery province or a saved delivery address is required');
    }

    const subtotal = cart.subtotal;
    const discountAmount = cart.coupon ? Number(cart.coupon.discountAmount) : 0;
    const discountedSubtotal = Math.max(subtotal - discountAmount, 0);

    const { deliveryFee, fragileSurcharge } = await this.deliveryCharges(province, cart.items);
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
          deliveryAddressId: address?.id ?? null,
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
   * Marks an order paid and issues its Tax Invoice. Called by the payment-gateway webhook or by
   * an admin confirming payment, never by the browser — a client asserting "I paid" is not proof
   * of payment.
   *
   * This is also the single point at which trade credit is committed, so both callers
   * (`OrdersController` and `PaymentsService.initiateTradeTerms`) get the same enforcement and
   * neither can route around it.
   */
  async confirmPayment(orderId: string, paymentRef: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    // Seen outside the transaction for a clear early error; the authoritative check is the
    // conditional update below, which is what actually prevents a concurrent double-confirm.
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order is already ${order.status}`);
    }

    const isTradeTerms = order.paymentMethod === 'TRADE_ACCOUNT_TERMS';
    const companyId = order.user.companyId;
    if (isTradeTerms && !companyId) {
      throw new BadRequestException('Trade account terms require a company trade account');
    }

    // Everything below is one transaction: the status transition and the credit reservation
    // commit together or not at all.
    //
    // The transition is a conditional update (`WHERE status = PENDING`), not a plain update. When
    // two callers confirm the same order at once — a gateway webhook retried while the first call
    // is still in flight, or an admin double-submitting — both read PENDING before either writes.
    // A plain update would let both through and consume the buyer's credit twice for one order. The
    // conditional update matches exactly one row under a row lock, so the loser matches zero and
    // aborts, rolling its reservation back with it.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'PAYMENT_CONFIRMED', paymentRef },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Order is already being confirmed');
      }

      if (isTradeTerms) {
        // Throws — aborting the transaction, undoing the claim above and leaving the order
        // PENDING — when the account is unapproved or has no headroom for this order's total.
        await this.tradeAccounts.consumeCredit(companyId!, Number(order.total), tx);
      }
    });

    const invoice = await this.legalTax.getOrGenerateInvoice(orderId);
    return { order: await this.findOne(orderId), invoice };
  }

  async cancel(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    if (!['PENDING', 'PAYMENT_CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Only unpaid or freshly-paid orders can be cancelled online');
    }

    // Releasing the credit and marking the order cancelled are one transaction, for the same
    // reason as confirmPayment: a crash between the two would either strand the credit (order
    // cancelled, commitment still held) or invite a second release on retry.
    return this.prisma.$transaction(async (tx) => {
      // A confirmed trade-terms order already took credit. Cancelling it must give that credit
      // back, or the commitment outlives the order and the account wedges itself out of its own
      // limit. A PENDING order never reserved credit, so there is nothing to release.
      if (order.status === 'PAYMENT_CONFIRMED' && order.paymentMethod === 'TRADE_ACCOUNT_TERMS') {
        const companyId = order.user.companyId;
        if (companyId) {
          await this.tradeAccounts.releaseCredit(companyId, Number(order.total), tx);
        }
      }

      return tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    });
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