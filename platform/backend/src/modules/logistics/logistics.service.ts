import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  getActiveCouriers() {
    return this.prisma.courier.findMany({ where: { active: true } });
  }

  getPickupPoints(province?: string) {
    return this.prisma.pickupPoint.findMany({
      where: { active: true, ...(province ? { province: province as never } : {}) },
    });
  }

  // Fragile-glazed shipments default to Besfleet (the Group's own trucking division) rather
  // than a general parcel courier — see the Compliance & Regulatory Framework, Section 10,
  // and docs/09-delivery-courier.md. Returns a courier suggestion, not an auto-booking.
  async suggestCourierForShipment(isFragile: boolean) {
    if (isFragile) {
      return { courierNameFreeText: 'Besfleet', reason: 'Fragile-glazed cargo — internal fleet default' };
    }
    const external = await this.prisma.courier.findFirst({ where: { active: true } });
    return external
      ? { courierId: external.id, courierName: external.name }
      : { courierNameFreeText: null, reason: 'No active courier configured — quote individually' };
  }
}
