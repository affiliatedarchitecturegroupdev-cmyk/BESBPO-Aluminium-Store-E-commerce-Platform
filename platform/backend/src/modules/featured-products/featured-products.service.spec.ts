import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { FeaturedProductsService } from './featured-products.service';

// The single-live-hero rule is backed by a partial unique index at the database (proven by
// scripts/smoke.sh). What matters here is the swap: promoting a new hero must demote the old one
// in the same transaction, rather than surfacing the index violation to the merchandiser.
describe('FeaturedProductsService', () => {
  function build(overrides: Record<string, unknown> = {}) {
    const tx = {
      featuredProduct: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'f1' }),
      },
    };
    const prisma = {
      featuredProduct: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
      ...overrides,
    };
    return { service: new FeaturedProductsService(prisma as never), prisma, tx };
  }

  it('demotes the current hero when a new one is promoted', async () => {
    const { service, tx } = build();

    await service.create({ productId: 'p1', note: 'Best-selling frame', isHero: true });

    expect(tx.featuredProduct.updateMany).toHaveBeenCalledWith({ where: { isHero: true }, data: { isHero: false } });
    expect(tx.featuredProduct.create).toHaveBeenCalled();
  });

  it('does not touch other picks when the new one is not a hero', async () => {
    const { service, tx } = build();

    await service.create({ productId: 'p1', note: 'Solid mid-range option' });

    expect(tx.featuredProduct.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to feature the same product twice', async () => {
    // The unique constraint would reject it; naming the conflict gives the merchandiser a
    // message instead of a raw database error.
    const { service } = build({
      featuredProduct: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing', productId: 'p1' }),
      },
    });

    await expect(service.create({ productId: 'p1', note: 'again' })).rejects.toThrow(ConflictException);
  });

  it('404s on an update to a pick that does not exist', async () => {
    const { service } = build();
    await expect(service.update('missing', { note: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('requests hero-first ordering so the magazine layout can read the hero off the front', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = build({ featuredProduct: { findMany, findUnique: jest.fn() } });

    await service.findPublished();
    expect(findMany.mock.calls[0][0].orderBy[0]).toEqual({ isHero: 'desc' });
  });

  it('scopes the storefront read to the scheduling window', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = build({ featuredProduct: { findMany, findUnique: jest.fn() } });

    await service.findPublished();
    const where = findMany.mock.calls[0][0].where;
    expect(where.published).toBe(true);
    expect(where.product).toEqual({ active: true });
  });
});
