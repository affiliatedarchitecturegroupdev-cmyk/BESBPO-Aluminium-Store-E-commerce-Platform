import { AnalyticsService } from './analytics.service';

// The DISTINCT ON dedupe is proven against a real database by scripts/smoke.sh. What these pin
// down is the contract around it: that history is scoped to the caller's own key, that a guest
// with no session gets an honest empty result rather than someone else's history, and that
// Recommended For You states its own basis instead of implying a model exists.
function buildAnalytics(overrides: Record<string, unknown> = {}) {
  const prisma = {
    analyticsEvent: { create: jest.fn().mockResolvedValue({ id: 'e1' }) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    product: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  return { service: new AnalyticsService(prisma as never), prisma };
}

describe('AnalyticsService product-view history', () => {
  // Shared with the getRecommendedFor suite below, which drives the same view-history read.
  const build = buildAnalytics;

  it('records the product id in metadata under the PRODUCT_VIEWED type', async () => {
    const { service, prisma } = build();

    await service.logProductView('p1', { userId: 'u1' });

    const data = (prisma.analyticsEvent.create as jest.Mock).mock.calls[0][0].data;
    expect(data.eventType).toBe('PRODUCT_VIEWED');
    expect(data.metadata).toEqual({ productId: 'p1' });
    expect(data.userId).toBe('u1');
  });

  it('keys a guest by session id instead of user id', async () => {
    const { service, prisma } = build();

    await service.logProductView('p1', { sessionId: 's1' });

    const data = (prisma.analyticsEvent.create as jest.Mock).mock.calls[0][0].data;
    expect(data.sessionId).toBe('s1');
    expect(data.userId).toBeUndefined();
  });

  it('returns nothing for a caller with neither a user nor a session key', async () => {
    // Without a key there is nothing to scope history to; falling through to an unscoped query
    // would leak other shoppers' view history.
    const { service, prisma } = build();

    await expect(service.getRecentlyViewed({})).resolves.toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('re-sorts the DISTINCT ON result by recency, not by the dedupe key', async () => {
    // DISTINCT ON forces the distinct key first in the ORDER BY, so the raw rows come back
    // grouped by product id. Rendering that order directly would show the section in a
    // meaningless sequence rather than "most recently viewed first".
    const older = new Date('2026-09-01T10:00:00Z');
    const newer = new Date('2026-09-02T10:00:00Z');
    const { service } = build({
      $queryRaw: jest.fn().mockResolvedValue([
        { productId: 'a', viewedAt: older },
        { productId: 'b', viewedAt: newer },
      ]),
      product: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ]),
      },
    });

    const result = await service.getRecentlyViewed({ userId: 'u1' });
    expect(result.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('drops a viewed product that has since been deactivated', async () => {
    const { service } = build({
      $queryRaw: jest.fn().mockResolvedValue([{ productId: 'a', viewedAt: new Date() }]),
      product: { findMany: jest.fn().mockResolvedValue([]) },
    });

    await expect(service.getRecentlyViewed({ sessionId: 's1' })).resolves.toEqual([]);
  });
});

describe('AnalyticsService.getRecommendedFor', () => {
  const build = buildAnalytics;
  it('states that it has no basis when there is no view history', async () => {
    const { service } = build();
    const result = await service.getRecommendedFor({ sessionId: 's1' });

    expect(result.items).toEqual([]);
    expect(result.basis).toBeNull();
    expect(result.reason).toMatch(/no view history/i);
  });

  it('recommends more from the sub-category of the last viewed product and says so', async () => {
    const { service } = build({
      $queryRaw: jest.fn().mockResolvedValue([{ productId: 'anchor', viewedAt: new Date() }]),
      product: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'anchor',
              sku: 'ALS-001',
              name: 'Standard Frame',
              subCategoryId: 'sc1',
              subCategory: { name: 'Casement Frames' },
            },
          ])
          .mockResolvedValueOnce([{ id: 'p2' }]),
      },
    });

    const result = await service.getRecommendedFor({ sessionId: 's1' });
    expect(result.items).toHaveLength(1);
    expect(result.basis).toMatchObject({ anchorSku: 'ALS-001', subCategory: 'Casement Frames' });
    expect(result.reason).toMatch(/Casement Frames/);
  });

  it('excludes the anchor from its own recommendations', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'anchor', sku: 'ALS-001', name: 'X', subCategoryId: 'sc1', subCategory: { name: 'Frames' } },
      ])
      .mockResolvedValueOnce([]);
    const { service } = build({
      $queryRaw: jest.fn().mockResolvedValue([{ productId: 'anchor', viewedAt: new Date() }]),
      product: { findMany },
    });

    await service.getRecommendedFor({ sessionId: 's1' });
    expect(findMany.mock.calls[1][0].where.id).toEqual({ not: 'anchor' });
  });
});
