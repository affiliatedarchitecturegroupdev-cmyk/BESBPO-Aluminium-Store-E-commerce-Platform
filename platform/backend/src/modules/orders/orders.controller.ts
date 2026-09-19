import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

type AuthedRequest = Request & { user: { id: string } };

// Buyer-facing order routes. Staff/admin reads live in the admin module; these are all
// scoped to the caller (docs/08-checkout-fulfilment.md).
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post('checkout')
  checkout(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    return this.service.checkout(req.user.id, dto);
  }

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.service.findMine(req.user.id);
  }

  @Get('number/:orderNumber')
  byNumber(@Req() req: AuthedRequest, @Param('orderNumber') orderNumber: string) {
    return this.service.findByOrderNumber(req.user.id, orderNumber);
  }

  @Post(':id/cancel')
  cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.cancel(id, req.user.id);
  }

  // Payment confirmation is a financial state change. It must not be reachable by the buyer's
  // session — a client asserting "I paid" is not proof of payment. Until the gateway webhook
  // is wired (Phase 2), it is restricted to admin/staff (docs/08-checkout-fulfilment.md).
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post(':id/confirm-payment')
  confirmPayment(@Param('id') id: string, @Body('paymentRef') paymentRef: string) {
    return this.service.confirmPayment(id, paymentRef);
  }
}