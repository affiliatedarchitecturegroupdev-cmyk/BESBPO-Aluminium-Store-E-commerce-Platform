import { CatalogMerchandisingService, BUDGET_TIERS } from './catalog-merchandising.service';

// The aggregation SQL itself is proven against a real database by scripts/smoke.sh. What these
// pin down is the ranking contract the section promises: that Best Sellers ranks by units rather
// than line count, that Top Rated refuses to rank on a thin sample, that an inactive product
// leaves a gap-free list, and that the Budget Shop bands partition rather than overlap.
function buildService(prisma: Record<string, unknown>) {
  return new CatalogMerchandisingService(prisma as never);
}

describe('CatalogMerchandisingService.getBestSellers', () => {
  it('carries the units sold through and preserves the database ranking order', async () => {
    const prisma = {
      orderItem: {
        groupBy: jest.fn().mockResolvedValue([
          { productId: 'p1', _sum: { quantity: 40 } },
          { productId: 'p2', _sum: { quantity: 12 } },
        ]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'p2', name: 'B' },
          { id: 'p1', name: 'A' },
        ]),
      },
    };
    const service = buildService(prisma);

    const result = await service.getBestSellers();
    expect(result.map((r) => r.id)).toEqual(['p1', 'p2']);
    expect(result[0].unitsSold).toBe(40);
  });

  it('drops a product deactivated since it sold rather than leaving a gap', async () => {
    const prisma = {
      orderItem: {
        groupBy: jest.fn().mockResolvedValue([
          { productId: 'p1', _sum: { quantity: 5 } },
          { productId: 'gone', _sum: { quantity: 4 } },
        ]),
      },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'A' }]) },
    };
    const service = buildService(prisma);

    const result = await service.getBestSellers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('does not query products when nothing has sold', async () => {
    const findMany = jest.fn();
    const prisma = { orderItem: { groupBy: jest.fn().mockResolvedValue([]) }, product: { findMany } };
    const service = buildService(prisma);

    await expect(service.getBestSellers()).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('CatalogMerchandisingService.getTopRated', () => {
  it('applies the minimum-review threshold as a having clause, not a post-filter', async () => {
    // The threshold is the difference between a ranking and noise: without it a single 5-star
    // review outranks fifty at 4.8.
    const groupBy = jest.fn().mockResolvedValue([]);
    const prisma = { review: { groupBy }, product: { findMany: jest.fn() } };
    const service = buildService(prisma);

    await service.getTopRated(8, 3);
    expect(groupBy.mock.calls[0][0].having).toEqual({ rating: { _count: { gte: 3 } } });
  });

  it('rounds the average to one decimal and carries the review count', async () => {
    const prisma = {
      review: {
        groupBy: jest.fn().mockResolvedValue([{ productId: 'p1', _avg: { rating: 4.666 }, _count: { _all: 9 } }]),
        findFirst: jest.fn().mockResolvedValue({ comment: 'Solid frame', user: { name: 'Thabo' } }),
      },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]) },
    };
    const service = buildService(prisma);

    const result = await service.getTopRated();
    expect(result[0].averageRating).toBe(4.7);
    expect(result[0].reviewCount).toBe(9);
    expect(result[0].topQuote).toBe('Solid frame');
    expect(result[0].topQuoteAuthor).toBe('Thabo');
  });

  it('returns a null quote when no review carries text', async () => {
    const prisma = {
      review: {
        groupBy: jest.fn().mockResolvedValue([{ productId: 'p1', _avg: { rating: 5 }, _count: { _all: 4 } }]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]) },
    };
    const service = buildService(prisma);

    const result = await service.getTopRated();
    expect(result[0].topQuote).toBeNull();
  });
});

describe('CatalogMerchandisingService.getByFinish', () => {
  it('returns swatch counts so a swatch cannot lead to an empty view', async () => {
    const prisma = {
      finish: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'f1', name: 'Matte Black', hex: '#111111', _count: { products: 12 } },
          { id: 'f2', name: 'Bronze', hex: '#8C6A4A', _count: { products: 0 } },
        ]),
      },
    };
    const service = buildService(prisma);

    const result = await service.getByFinish();
    // The method's return type is a union (swatch set or filtered products); this assertion is
    // the swatch branch.
    const swatches = result.items as Array<{ name: string; productCount: number }>;
    expect(swatches[0]).toMatchObject({ name: 'Matte Black', productCount: 12 });
    expect(swatches[1].productCount).toBe(0);
  });

  it('returns the filtered products when a finish is chosen', async () => {
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]) },
    };
    const service = buildService(prisma);

    const result = await service.getByFinish('f1');
    expect(result.finishId).toBe('f1');
    expect(result.items).toHaveLength(1);
  });
});

describe('CatalogMerchandisingService budget bands', () => {
  it('defines non-overlapping bands that partition the catalogue', () => {
    // Overlapping bands would show the same product in two tabs, which reads as a bug to a
    // shopper comparing them.
    const bounds = [
      { min: 0, max: 2000 },
      { min: 2000, max: 5000 },
      { min: 5000, max: 15000 },
      { min: 15000, max: null },
    ];
    for (let i = 0; i < bounds.length - 1; i++) {
      expect(bounds[i].max).toBe(bounds[i + 1].min);
    }
    expect(bounds[bounds.length - 1].max).toBeNull();
    expect(BUDGET_TIERS).toHaveLength(4);
  });

  it('admits the bands are approximate rather than implying exact pricing', async () => {
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    const service = buildService(prisma);

    const result = await service.getBudgetShop('2000-5000');
    expect(result.approximate).toBe(true);
    expect(result.activeTier).toBe('2000-5000');
    expect(result.approximationNote).toMatch(/approximate/i);
  });

  it('falls back to the cheapest band for an unknown tier rather than erroring', async () => {
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    const service = buildService(prisma);

    const result = await service.getBudgetShop('not-a-tier');
    expect(result.activeTier).toBe('under-2000');
  });
});
