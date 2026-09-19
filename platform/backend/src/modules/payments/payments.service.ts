import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

// Adapter-per-gateway pattern: PayFast (retail), Lulapay (B2B BNPL), PayJustNow (retail BNPL).
// Trade Account Terms and EFT bypass a live gateway and reconcile against the existing
// Besbpo/Aluminium Store invoicing system — see docs/11-payments.md.
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { user: { include: { company: { include: { tradeAccount: true } } } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    // A buyer may only pay for their own order.
    if (order.userId !== userId) throw new ForbiddenException('Not your order');

    switch (dto.method) {
      case 'PAYFAST':
        return this.initiatePayfast(dto);
      case 'LULAPAY_BNPL':
        return this.initiateLulapay(dto, order.user.company?.tradeAccount?.approved ?? false);
      case 'PAYJUSTNOW':
        return this.initiatePayJustNow(dto);
      case 'TRADE_ACCOUNT_TERMS':
        return this.initiateTradeTerms(dto, order.user.company?.tradeAccount?.approved ?? false);
      case 'EFT':
        return { instructions: 'Manual EFT — reference will be emailed', orderId: dto.orderId };
      default:
        throw new BadRequestException('Unsupported payment method');
    }
  }

  private initiatePayfast(dto: InitiatePaymentDto) {
    // Build PayFast redirect payload — merchant credentials via env, signature per PayFast spec.
    return { redirectUrl: `https://www.payfast.co.za/eng/process?order=${dto.orderId}` };
  }

  // BNPL and trade terms are credit products: both are restricted to approved TradeAccount
  // holders, so an unapproved buyer cannot take goods on terms.
  private initiateLulapay(dto: InitiatePaymentDto, tradeApproved: boolean) {
    if (!tradeApproved) throw new ForbiddenException('Lulapay is available to approved trade accounts');
    return { redirectUrl: `https://checkout.lulapay.com/session?order=${dto.orderId}` };
  }

  private initiatePayJustNow(dto: InitiatePaymentDto) {
    return { redirectUrl: `https://secure.payjustnow.com/checkout?order=${dto.orderId}` };
  }

  private async initiateTradeTerms(dto: InitiatePaymentDto, tradeApproved: boolean) {
    if (!tradeApproved) throw new ForbiddenException('Trade account terms require an approved trade account');
    const order = await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { paymentMethod: 'TRADE_ACCOUNT_TERMS', status: 'PAYMENT_CONFIRMED' },
    });
    return { order, note: 'Invoiced on trade account terms' };
  }

  handlePayfastWebhook(payload: Record<string, unknown>) {
    // Verify ITN signature per PayFast docs before trusting payload in production.
    return { received: true, payload };
  }

  handleLulapayWebhook(payload: Record<string, unknown>) {
    return { received: true, payload };
  }
}
