import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(userId: string | null, dto: TrackEventDto) {
    return this.prisma.analyticsEvent.create({
      data: {
        userId: userId ?? undefined,
        sessionId: dto.sessionId,
        eventType: dto.eventType,
        metadata: dto.metadata as never,
      },
    });
  }

  findByType(eventType?: string) {
    return this.prisma.analyticsEvent.findMany({
      where: eventType ? { eventType } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  // Convenience wrapper other modules call directly (e.g. cmi-routing logs a
  // "CMI_ROUTED" event) rather than importing PrismaService just for this one write.
  logServerEvent(eventType: string, metadata: Record<string, unknown>, userId?: string) {
    return this.prisma.analyticsEvent.create({ data: { userId, eventType, metadata: metadata as never } });
  }

  // ---- PRODUCT_VIEWED — the single writer for Recently Viewed and Recommended For You -----
  //
  // Both sections read this event stream, so the write is centralised here rather than being
  // left to whichever controller happens to render a PDP. Keyed by userId when the shopper is
  // signed in and by an anonymous sessionId otherwise, which is what lets Recently Viewed work
  // for a guest (docs/37-merchandising-sections.md).
  //
  // `productId` is stored in `metadata` rather than as a column: AnalyticsEvent is a generic
  // event table and every other event type already carries its payload this way. Adding a
  // productId column would special-case one event type in an otherwise uniform table.
  async logProductView(productId: string, opts: { userId?: string | null; sessionId?: string | null }) {
    return this.prisma.analyticsEvent.create({
      data: {
        userId: opts.userId ?? undefined,
        sessionId: opts.sessionId ?? undefined,
        eventType: 'PRODUCT_VIEWED',
        metadata: { productId } as never,
      },
    });
  }

  // ---- Recently Viewed -------------------------------------------------------------------
  //
  // The newest view of each distinct product for one key, most recent first. DISTINCT ON is the
  // right tool here — a plain `orderBy occurredAt desc` would return the same product once per
  // view and fill the row with duplicates, which is the obvious way to get this wrong.
  //
  // The server copy exists as the cross-device fallback; the component also keeps a localStorage
  // copy for instant same-device rendering, so this path is allowed to be a little slower.
  async getRecentlyViewed(opts: { userId?: string | null; sessionId?: string | null; take?: number }) {
    const take = Math.min(opts.take ?? 8, 24);
    const key = opts.userId ? { userId: opts.userId } : opts.sessionId ? { sessionId: opts.sessionId } : null;
    if (!key) return []; // anonymous with no session — nothing to key the history on

    const rows = await this.prisma.$queryRaw<Array<{ productId: string; viewedAt: Date }>>`
      SELECT DISTINCT ON (e."metadata"->>'productId')
             e."metadata"->>'productId' AS "productId",
             e."occurredAt"             AS "viewedAt"
      FROM "AnalyticsEvent" e
      WHERE e."eventType" = 'PRODUCT_VIEWED'
        AND e."metadata"->>'productId' IS NOT NULL
        AND (${opts.userId ?? null}::text IS NOT NULL AND e."userId" = ${opts.userId ?? null}
             OR ${opts.sessionId ?? null}::text IS NOT NULL AND e."sessionId" = ${opts.sessionId ?? null})
      ORDER BY e."metadata"->>'productId', e."occurredAt" DESC
    `;
    if (rows.length === 0) return [];

    // Re-sort by recency after the DISTINCT ON (which necessarily orders by the distinct key
    // first) and cut to size, then hydrate in view order.
    const ordered = rows.sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime()).slice(0, take);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ordered.map((r) => r.productId) }, active: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, subCategory: { include: { category: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return ordered.flatMap((r) => {
      const product = byId.get(r.productId);
      return product ? [{ ...product, viewedAt: r.viewedAt }] : [];
    });
  }

  // ---- Recommended For You ---------------------------------------------------------------
  //
  // This is a mechanism, not a finished recommender, and the code says so rather than dressing
  // it up. The rule is deliberately naive: "more products from the sub-category of the last
  // thing you viewed". A real model needs training data this catalogue does not have yet.
  //
  // The `reason` string travels to the client so the section can state its own basis instead of
  // implying a personalisation engine exists behind it.
  async getRecommendedFor(opts: { userId?: string | null; sessionId?: string | null; take?: number }) {
    const take = Math.min(opts.take ?? 8, 24);
    const recentlyViewed = await this.getRecentlyViewed({ ...opts, take: 1 });

    if (recentlyViewed.length === 0) {
      // The honest empty state. No view history means no basis for a recommendation, and the
      // component renders exactly that rather than falling back to a generic "popular" row that
      // would look personalised but would not be.
      return {
        items: [],
        basis: null,
        reason: 'Recommendations appear once you have viewed a product — we have no view history for you yet.',
      };
    }

    const anchor = recentlyViewed[0];
    const items = await this.prisma.product.findMany({
      where: {
        active: true,
        subCategoryId: anchor.subCategoryId,
        id: { not: anchor.id }, // the anchor itself is not a recommendation
      },
      orderBy: { retailPrice: 'asc' },
      take,
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, subCategory: { include: { category: true } } },
    });

    return {
      items,
      basis: { anchorSku: anchor.sku, anchorName: anchor.name, subCategory: anchor.subCategory?.name ?? null },
      reason: `More from ${anchor.subCategory?.name ?? 'the same sub-category'} — the sub-category of the last product you viewed.`,
    };
  }
}
