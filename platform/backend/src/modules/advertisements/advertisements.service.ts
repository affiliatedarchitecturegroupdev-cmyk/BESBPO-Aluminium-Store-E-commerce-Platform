import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';

@Injectable()
export class AdvertisementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns one active ad per slot (1-8), respecting the optional campaign date window —
  // the homepage renders these between sections in slot order.
  async getActiveBySlot() {
    const now = new Date();
    const ads = await this.prisma.advertisement.findMany({
      where: {
        active: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      orderBy: { slot: 'asc' },
    });
    const bySlot = new Map<number, (typeof ads)[number]>();
    for (const ad of ads) if (!bySlot.has(ad.slot)) bySlot.set(ad.slot, ad);
    return Array.from(bySlot.values());
  }

  create(dto: CreateAdvertisementDto) {
    return this.prisma.advertisement.create({ data: dto as never });
  }
}
