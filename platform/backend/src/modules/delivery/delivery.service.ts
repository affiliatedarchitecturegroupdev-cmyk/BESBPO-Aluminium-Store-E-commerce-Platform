import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QuoteDeliveryDto } from './dto/quote-delivery.dto';

const FRAGILE_SURCHARGE_PCT = 0.08; // matches Pricing Framework — Delivery & Additional Charges

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // Weight-based, distance-banded fee — same model already standing as policy on Roofsteel,
  // extended here with the fragile-glazing handling surcharge.
  async quoteDelivery(dto: QuoteDeliveryDto) {
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { province: dto.province as never, weightBandKg: { gte: dto.weightKg } },
      orderBy: { weightBandKg: 'asc' },
    });
    if (!zone) {
      return { quoteIndividually: true, reason: 'Above standard weight/distance bands' };
    }
    const fragileFee = dto.isFragile ? Number(zone.baseFee) * FRAGILE_SURCHARGE_PCT : 0;
    return {
      baseFee: zone.baseFee,
      fragileSurcharge: fragileFee,
      total: Number(zone.baseFee) + fragileFee,
    };
  }
}
