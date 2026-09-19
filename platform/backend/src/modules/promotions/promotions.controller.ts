import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  // Public — active bundles for the homepage "Bundles" section.
  @Get('bundles')
  activeBundles() {
    return this.service.getActiveBundles();
  }

  // Called from the cart before checkout to validate + preview a coupon's effect.
  @Post('coupons/validate')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.service.validateCoupon(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.service.createCoupon(dto);
  }
}
