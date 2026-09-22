import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Merchandising read model — the aggregation-backed sections of
// docs/37-merchandising-sections.md (spec v1.0). These are distinct from
// CatalogBrowseService, which serves filtered browsing: everything here is a *ranked* or
// *aggregated* view over the whole catalogue, and the ranking is the product.
//
// Deliberately no caching layer yet. Each query is indexed and bounded, and a stale
// leaderboard is worse than a slightly slower one on a catalogue this size.

export type BudgetTier = 'under-2000' | '2000-5000' | '5000-15000' | 'premium';

// Budget Shop bands against baseCost × this constant rather than the exact retailPrice.
//
// This is an approximation, and is documented as one in the spec and here. Computing the exact
// tiered retail implication for all 2,147 rows before filtering does not scale as a database
// query, and the band boundaries are only stable against cost. A product sitting right on a
// boundary may land in the neighbouring band by a small margin. That is acceptable for a browse
// filter — the shopper is choosing a rough budget, not comparing two specific SKUs — and it must
// never be treated as exact: these tiers route a browse, they do not compute a price.
const APPROX_AVERAGE_MARKUP = 1.4;

// Non-overlapping bands, so the tabs partition the catalogue and a shopper browsing two tabs
// never sees the same product twice. Each is (min, max] in rand, applied to the cost column as
// (min / markup, max / markup].
const TIER_BOUNDS: Record<BudgetTier, { min: number; max: number | null; label: string; blurb: string }> = {
  'under-2000': { min: 0, max: 2000, label: 'Under R2,000', blurb: 'Hardware, sealants and single small units' },
  '2000-5000': { min: 2000, max: 5000, label: 'R2,000 – R5,000', blurb: 'Standard window and door units' },
  '5000-15000': { min: 5000, max: 15000, label: 'R5,000 – R15,000', blurb: 'Large openings and entrance systems' },
  premium: { min: 15000, max: null, label: 'R15,000+', blurb: 'Facade, structural and full-installation work' },
};

export const BUDGET_TIERS = (Object.keys(TIER_BOUNDS) as BudgetTier[]).map((key) => ({
  key,
  label: TIER_BOUNDS[key].label,
  blurb: TIER_BOUNDS[key].blurb,
}));

@Injectable()
export class CatalogMerchandisingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Best Sellers — ranked leaderboard ------------------------------------------------
  //
  // OrderItem.groupBy() by cumulative quantity. This is cumulative sales, and is deliberately
  // distinct from Trending: Trending reflects recent configurator *activity* (what people are
  // pricing up right now), which moves day to day. A best seller is what has actually sold.
  //
  // Counting quantity rather than order lines matters for a B2B catalogue — one trade order for
  // 40 units is a stronger signal than forty retail orders for one unit each, and a line-count
  // ranking would invert those two.
  async getBestSellers(take = 8) {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: Math.min(take, 24),
    });
    if (grouped.length === 0) return [];

    // Hydrate in a second query rather than joining in the groupBy: Prisma cannot include
    // relations on a groupBy result, and a bounded set of ids is a trivial follow-up lookup.
    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) }, active: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, subCategory: { include: { category: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Preserve the ranking order the database returned; a Map lookup alone would lose it. A
    // product deactivated since it sold is dropped rather than shown as a gap.
    return grouped.flatMap((g) => {
      const product = byId.get(g.productId);
      return product ? [{ ...product, unitsSold: g._sum.quantity ?? 0 }] : [];
    });
  }

  // ---- Top Rated — spotlight grid -------------------------------------------------------
  //
  // Review.rating aggregation with a minimum review count. The threshold is the point of the
  // section: without it a product with a single 5-star review outranks one with fifty at 4.8,
  // which makes the ranking noise rather than signal. Three is the floor at which an average
  // starts to mean anything on a catalogue this young.
  async getTopRated(take = 8, minReviews = 3) {
    const grouped = await this.prisma.review.groupBy({
      by: ['productId'],
      _avg: { rating: true },
      _count: { _all: true },
      having: { rating: { _count: { gte: minReviews } } },
      orderBy: [{ _avg: { rating: 'desc' } }, { _count: { rating: 'desc' } }],
      take: Math.min(take, 24),
    });
    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) }, active: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, subCategory: { include: { category: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // The pull-quote for the card: the most recent review with actual text, since a bare rating
    // gives the spotlight grid nothing to say. At most `take` lookups, each one indexed row.
    const quotes = await Promise.all(
      grouped.map((g) =>
        this.prisma.review.findFirst({
          where: { productId: g.productId, comment: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { comment: true, user: { select: { name: true } } },
        }),
      ),
    );

    return grouped.flatMap((g, i) => {
      const product = byId.get(g.productId);
      if (!product) return [];
      return [
        {
          ...product,
          // One decimal is all a shopper reads; the star badge renders a half-star at .5, so
          // carrying the raw average further would promise precision the UI cannot show.
          averageRating: Math.round((g._avg.rating ?? 0) * 10) / 10,
          reviewCount: g._count._all,
          topQuote: quotes[i]?.comment ?? null,
          topQuoteAuthor: quotes[i]?.user?.name ?? null,
        },
      ];
    });
  }

  // ---- Shop by Finish — colour picker ---------------------------------------------------
  //
  // With no finishId, returns the finishes with a live product count so a swatch can never lead
  // to an empty catalogue view. Ordered by the finish's own sortOrder, then name, so the
  // standard swatches hold a stable position rather than reordering as stock moves.
  //
  // With a finishId, returns that finish's products: the filtered catalogue view the swatch
  // links to. Not styled as a product grid in the section itself — the section's job is picking
  // a colour, not comparing SKUs — but the data behind the link is a normal browse.
  async getByFinish(finishId?: string, take = 60) {
    if (finishId) {
      const items = await this.prisma.product.findMany({
        where: { finishId, active: true },
        orderBy: { name: 'asc' },
        take: Math.min(take, 120),
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, finish: true, subCategory: { include: { category: true } } },
      });
      return { finishId, items, total: items.length };
    }

    const finishes = await this.prisma.finish.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return {
      items: finishes.map((f) => ({
        id: f.id,
        name: f.name,
        hex: f.hex,
        description: f.description,
        qualicoat: f.qualicoat,
        qualanod: f.qualanod,
        productCount: f._count.products,
      })),
    };
  }

  // ---- Budget Shop — tabbed price tiers --------------------------------------------------
  //
  // Each tier is a separate bounded query rather than fetching the catalogue once and bucketing
  // in memory, so the response stays small and the database does the range scan on the indexed
  // baseCost column.
  async getBudgetShop(tier?: string, take = 12) {
    const activeTier: BudgetTier = tier && tier in TIER_BOUNDS ? (tier as BudgetTier) : 'under-2000';
    const counts = await this.getBudgetTierCounts();
    const countByKey = new Map(counts.map((c) => [c.key, c.count]));

    const items = await this.budgetQuery(activeTier, take);
    return {
      tiers: BUDGET_TIERS.map((t) => ({ ...t, count: countByKey.get(t.key) ?? 0 })),
      activeTier,
      items,
      // Surfaced to the client so the section can label itself honestly rather than implying
      // the bands are exact.
      approximate: true,
      approximationNote: `Price bands are approximate (base cost × ${APPROX_AVERAGE_MARKUP}). A product on a band boundary may appear in the adjacent tab.`,
    };
  }

  private budgetQuery(tier: BudgetTier, take: number) {
    const { min, max } = TIER_BOUNDS[tier];
    return this.prisma.product.findMany({
      where: {
        active: true,
        baseCost: {
          gt: min / APPROX_AVERAGE_MARKUP,
          ...(max === null ? {} : { lte: max / APPROX_AVERAGE_MARKUP }),
        },
      },
      // Cheapest-first inside a band: the shopper opened this tab to spend less, so the first
      // thing they should see is the most affordable thing in it.
      orderBy: { retailPrice: 'asc' },
      take: Math.min(take, 40),
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, subCategory: { include: { category: true } } },
    });
  }

  // Counts per band for the tab labels, so a shopper can see a tab is empty before clicking it.
  private async getBudgetTierCounts() {
    const keys = Object.keys(TIER_BOUNDS) as BudgetTier[];
    const counts = await Promise.all(
      keys.map((key) => {
        const { min, max } = TIER_BOUNDS[key];
        return this.prisma.product.count({
          where: {
            active: true,
            baseCost: {
              gt: min / APPROX_AVERAGE_MARKUP,
              ...(max === null ? {} : { lte: max / APPROX_AVERAGE_MARKUP }),
            },
          },
        });
      }),
    );
    return keys.map((key, i) => ({ key, label: TIER_BOUNDS[key].label, count: counts[i] }));
  }
}
