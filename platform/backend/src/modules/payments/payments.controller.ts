import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthedRequest = Request & { user: { id: string } };

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // Payment initiation is buyer-scoped: the service checks the order belongs to the caller
  // before doing anything, because this endpoint can move an order to PAYMENT_CONFIRMED
  // (see PaymentsService.initiateTradeTerms). It was previously unauthenticated, which let
  // anyone confirm any order as "paid" on trade terms.
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiate(@Req() req: AuthedRequest, @Body() dto: InitiatePaymentDto) {
    return this.service.initiate(req.user.id, dto);
  }

  // FIXME(phase-2): these webhooks must verify the gateway's signature (PayFast ITN, Lulapay
  // HMAC) before the payload is trusted. They are deliberately inert — they acknowledge and
  // do not change order state — so an unsigned request cannot mark an order paid. Wire real
  // signature verification, then have them call OrdersService.confirmPayment
  // (docs/11-payments.md, docs/08-checkout-fulfilment.md).
  @Post('webhook/payfast')
  payfastWebhook(@Body() payload: Record<string, unknown>) {
    return this.service.handlePayfastWebhook(payload);
  }

  @Post('webhook/lulapay')
  lulapayWebhook(@Body() payload: Record<string, unknown>) {
    return this.service.handleLulapayWebhook(payload);
  }
}
