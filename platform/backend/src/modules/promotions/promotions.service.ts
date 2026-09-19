import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  getActiveBundles() {
    return this.prisma.bundle.findMany({
      where: { active: true },
      include: { items: { include: { product: true } } },
    });
  }

  // Validates a coupon against expiry, usage limit, and minimum cart value, and returns the
  // computed discount amount — the cart/checkout flow calls this rather than re-implementing
  // coupon math client-side, so the discount a buyer sees is always server-verified.
  async validateCoupon(dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (!coupon || !coupon.active) throw new NotFoundException('Coupon not found');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    if (coupon.minCartValue && dto.cartValue < Number(coupon.minCartValue)) {
      throw new BadRequestException(`Minimum cart value of R${coupon.minCartValue} not met`);
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = dto.cartValue * (Number(coupon.value) / 100);
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discountAmount = Math.min(Number(coupon.value), dto.cartValue);
    }
    // FREE_SHIPPING is applied by the delivery module zeroing the fee, not as a cart discount —
    // signalled here so the caller knows to skip the delivery fee line.

    return {
      couponId: coupon.id,
      type: coupon.type,
      discountAmount: Math.round(discountAmount * 100) / 100,
      freeShipping: coupon.type === 'FREE_SHIPPING',
    };
  }

  createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupon.create({ data: dto as never });
  }
}
