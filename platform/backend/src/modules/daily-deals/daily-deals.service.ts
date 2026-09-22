import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDailyDealDto } from './dto/create-daily-deal.dto';
import { UpdateDailyDealDto } from './dto/update-daily-deal.dto';

// Deals of the Day (the Daily Deals section of docs/37-merchandising-sections.md).
//
// Urgency by design: live countdown clocks and stock-progress bars. The countdown and the bar
// are a display of a real constraint — `claim()` enforces `stockLimit` server-side, so the
// frontend bar can never be the only thing preventing an over-sold capped deal.
//
// Clearance and Daily Deals are deliberately different mechanisms: clearance has no expiry
// framing and is a merchandising markdown on stock lines; a daily deal is a time-boxed,
// quantity-capped promotion. They do not share a model or a code path.
@Injectable()
export class DailyDealsService {
  constructor(private readonly prisma: PrismaService) {}

  // The storefront read. Only deals that are live right now — started, not yet ended — because
  // the section's whole premise is a clock that is actually counting down. A deal scheduled for
  // tomorrow belongs in neither the countdown nor the progress bar.
  async findActive(take = 4) {
    const now = new Date();
    const deals = await this.prisma.dailyDeal.findMany({
      where: {
        published: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
        product: { active: true },
      },
      // Ending soonest first: the deal with the least time left is the one worth surfacing.
      orderBy: { endsAt: 'asc' },
      take: Math.min(take, 12),
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            subCategory: { include: { category: true } },
          },
        },
      },
    });

    return deals.map((d) => ({
      ...d,
      remaining: Math.max(d.stockLimit - d.claimed, 0),
      // Derived server-side so the bar and the clock are computed from the same clock the
      // enforcement uses — a client with a skewed clock cannot show a deal as still live when
      // the server considers it closed.
      msRemaining: d.endsAt.getTime() - now.getTime(),
      soldOut: d.claimed >= d.stockLimit,
    }));
  }

  findAll() {
    return this.prisma.dailyDeal.findMany({
      orderBy: { endsAt: 'asc' },
      include: { product: { select: { sku: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const deal = await this.prisma.dailyDeal.findUnique({ where: { id }, include: { product: true } });
    if (!deal) throw new NotFoundException(`Daily deal ${id} not found`);
    return deal;
  }

  // The over-sell guard, and the reason this section has a server component at all.
  //
  // A single guarded UPDATE increments `claimed` only while there is room:
  //   WHERE id = ? AND published AND now inside the window AND claimed + n <= stockLimit
  // Postgres takes a row lock for the update, so two concurrent claims serialise and the second
  // matches zero rows rather than both reading the same `claimed` and both writing. Reading the
  // row first and then updating would reintroduce exactly that race — the same shape as the
  // trade-credit commitment, and for the same reason.
  //
  // The CHECK constraint `claimed <= stockLimit` backs this at the database, so even a direct
  // SQL write cannot oversell a capped deal.
  async claim(dealId: string, quantity = 1) {
    if (quantity < 1) throw new BadRequestException('Quantity must be at least 1');

    const now = new Date();
    const updated = await this.prisma.$executeRaw`
      UPDATE "DailyDeal"
      SET "claimed" = "claimed" + ${quantity}
      WHERE "id" = ${dealId}
        AND "published" = true
        AND "startsAt" <= ${now}
        AND "endsAt" > ${now}
        AND "claimed" + ${quantity} <= "stockLimit"
    `;

    if (updated === 0) {
      // Zero rows matched: the deal does not exist, is not live, or is sold out. Distinguishing
      // them costs one extra read but produces a message a buyer can act on, rather than a bare
      // "already claimed" that reads as a bug when the real cause is an ended clock.
      const deal = await this.prisma.dailyDeal.findUnique({ where: { id: dealId } });
      if (!deal) throw new NotFoundException(`Daily deal ${dealId} not found`);
      if (!deal.published) throw new BadRequestException('This deal is not available');
      if (deal.startsAt > now) throw new BadRequestException('This deal has not started yet');
      if (deal.endsAt <= now) throw new BadRequestException('This deal has ended');
      throw new BadRequestException(
        `Only ${Math.max(deal.stockLimit - deal.claimed, 0)} left at this price`,
      );
    }

    const deal = await this.prisma.dailyDeal.findUnique({ where: { id: dealId } });
    return { ...deal, remaining: Math.max((deal?.stockLimit ?? 0) - (deal?.claimed ?? 0), 0) };
  }

  // Returns a claim when an order is cancelled or a payment fails, so the last unit is not lost
  // to an abandoned checkout. Conditional on `claimed - n >= 0` so a double release cannot drive
  // the counter negative (which the CHECK constraint would reject anyway, failing the caller).
  async release(dealId: string, quantity = 1) {
    const updated = await this.prisma.$executeRaw`
      UPDATE "DailyDeal"
      SET "claimed" = "claimed" - ${quantity}
      WHERE "id" = ${dealId}
        AND "claimed" - ${quantity} >= 0
    `;
    if (updated === 0) throw new BadRequestException('Nothing to release on this deal');
    return { released: quantity };
  }

  async create(dto: CreateDailyDealDto) {
    return this.prisma.dailyDeal.create({ data: dto as never, include: { product: { select: { sku: true, name: true } } } });
  }

  async update(id: string, dto: UpdateDailyDealDto) {
    await this.findOne(id);
    // `claimed` is moved only by claim() and release(), so a curator editing a deal cannot
    // silently reset the sold count and re-sell the cap. The fields are named explicitly rather
    // than spread: the global ValidationPipe's `whitelist` would strip an extra key on the HTTP
    // path, but this method is also reachable directly and should hold the invariant itself.
    const data: Record<string, unknown> = {};
    if (dto.productId !== undefined) data.productId = dto.productId;
    if (dto.dealPrice !== undefined) data.dealPrice = dto.dealPrice;
    if (dto.stockLimit !== undefined) data.stockLimit = dto.stockLimit;
    if (dto.headline !== undefined) data.headline = dto.headline;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt;
    if (dto.published !== undefined) data.published = dto.published;

    return this.prisma.dailyDeal.update({ where: { id }, data: data as never });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.dailyDeal.delete({ where: { id } });
  }
}
