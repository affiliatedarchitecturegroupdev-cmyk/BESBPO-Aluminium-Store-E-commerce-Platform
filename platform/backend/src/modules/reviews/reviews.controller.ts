import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Public read (verified-purchase writes are JWT-gated). See docs/14-reviews-notifications.md.
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('reviews/latest')
  latest(@Query('take') take?: string) {
    return this.service.findLatest(take ? Number(take) : 6);
  }

  @Get('products/:productId/reviews')
  forProduct(@Param('productId') productId: string) {
    return this.service.findForProduct(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateReviewDto) {
    return this.service.create(req.user.id, dto);
  }
}