import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WishlistsService } from './wishlists.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistsController {
  constructor(private readonly service: WishlistsService) {}

  @Get()
  get(@Req() req: Request & { user: { id: string } }) {
    return this.service.getOrCreate(req.user.id);
  }

  @Post('items')
  addItem(@Req() req: Request & { user: { id: string } }, @Body() dto: AddWishlistItemDto) {
    return this.service.addItem(req.user.id, dto);
  }

  @Delete('items/:productId')
  removeItem(@Req() req: Request & { user: { id: string } }, @Param('productId') productId: string) {
    return this.service.removeItem(req.user.id, productId);
  }
}
