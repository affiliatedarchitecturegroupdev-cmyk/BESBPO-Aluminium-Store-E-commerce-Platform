import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProductPairingsService } from './product-pairings.service';

// "Complete the Project" is directional and curated. What these pin down is that the direction
// is respected on the read, and that the curation rules (no self-pairing, no duplicate pair, no
// re-pointing an existing pair) hold at the service rather than only at the table.
describe('ProductPairingsService', () => {
  function build(overrides: Record<string, unknown> = {}) {
    const prisma = {
      productPairing: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'pair1' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      ...overrides,
    };
    return { service: new ProductPairingsService(prisma as never), prisma };
  }

  it('reads only the outbound direction for the anchored product', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = build({ productPairing: { findMany, findUnique: jest.fn() } });

    await service.findForProduct('anchor');
    expect(findMany.mock.calls[0][0].where.sourceId).toBe('anchor');
  });

  it('resolves the SKU the PDP route carries to a product id', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'p9' }) },
      productPairing: { findMany, findUnique: jest.fn() },
    };
    const service = new ProductPairingsService(prisma as never);

    await service.findForSku('ALS-001');
    expect(findMany.mock.calls[0][0].where.sourceId).toBe('p9');
  });

  it('404s when the SKU is unknown', async () => {
    const prisma = { product: { findUnique: jest.fn().mockResolvedValue(null) }, productPairing: {} };
    const service = new ProductPairingsService(prisma as never);

    await expect(service.findForSku('nope')).rejects.toThrow(NotFoundException);
  });

  it('refuses to pair a product with itself', async () => {
    const { service } = build();
    await expect(service.create({ sourceId: 'p1', targetId: 'p1' })).rejects.toThrow(BadRequestException);
  });

  it('refuses a duplicate pairing', async () => {
    const { service } = build({
      productPairing: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
        findMany: jest.fn(),
      },
    });

    await expect(service.create({ sourceId: 'p1', targetId: 'p2' })).rejects.toThrow(BadRequestException);
  });

  it('names a missing endpoint rather than letting the foreign key 500', async () => {
    const { service } = build({
      product: { findUnique: jest.fn().mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce(null) },
    });

    await expect(service.create({ sourceId: 'p1', targetId: 'ghost' })).rejects.toThrow(NotFoundException);
  });

  it('refuses to re-point an existing pairing through update', async () => {
    // Re-pointing would bypass both the uniqueness rule and the self-pairing check.
    const { service } = build({
      productPairing: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pair1' }),
        findMany: jest.fn(),
      },
    });

    await expect(service.update('pair1', { targetId: 'p3' })).rejects.toThrow(BadRequestException);
  });

  it('leaves the computed pairings stub empty rather than guessing', async () => {
    // A half-built co-occurrence heuristic looking personalised would be worse than an honest
    // empty result; the curated path is what the PDP reads today.
    const { service } = build();
    await expect(service.getComputedPairings('p1')).resolves.toEqual([]);
  });
});
