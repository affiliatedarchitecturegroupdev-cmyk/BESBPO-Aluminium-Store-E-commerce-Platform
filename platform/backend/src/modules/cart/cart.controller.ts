import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthedRequest = Request & { user: { id: string } };

// Every route is user-scoped and JWT-gated — a cart belongs to its owner, never listed
// globally. See docs/08-checkout-fulfilment.md.
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  get(@Req() req: AuthedRequest, @Query('coupon') coupon?: string) {
    return this.service.getCart(req.user.id, coupon);
  }

  @Post('items')
  addItem(@Req() req: AuthedRequest, @Body() dto: AddCartItemDto) {
    return this.service.addItem(req.user.id, dto);
  }

  @Patch('items/:id')
  updateItem(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.service.updateItem(req.user.id, id, dto);
  }

  @Delete('items/:id')
  removeItem(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.removeItem(req.user.id, id);
  }
}