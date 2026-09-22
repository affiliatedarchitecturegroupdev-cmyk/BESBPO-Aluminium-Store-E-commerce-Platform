import { CatalogBrowseService } from './catalog-browse.service';

// The storefront links into `/catalogue?finish=<id>` from the Shop by Finish swatches and
// `/catalogue?clearance=1` from the hero "Shop Clearance" CTA. These pin down that each query
// parameter actually reaches the database predicate — a param that is accepted but ignored
// renders the unfiltered catalogue under a filtered heading, which is the defect this covers.
function buildService() {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const prisma = { product: { findMany, count } };
  const service = new CatalogBrowseService(prisma as never);
  return { service, findMany, count };
}

describe('CatalogBrowseService.findProducts', () => {
  it('filters by finish when a finishId is given', async () => {
    const { service, findMany } = buildService();

    await service.findProducts({ finishId: 'finish-1' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ finishId: 'finish-1' }) }));
  });

  it('applies the same finish predicate to the count, so the total matches the grid', async () => {
    const { service, count } = buildService();

    await service.findProducts({ finishId: 'finish-1' });

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ finishId: 'finish-1' }) });
  });

  it('does not constrain finish when none is given', async () => {
    const { service, findMany } = buildService();

    await service.findProducts({});

    const where = findMany.mock.calls[0][0].where as Record<string, unknown>;
    expect(where).not.toHaveProperty('finishId');
  });

  it('combines a finish with a sector rather than one replacing the other', async () => {
    const { service, findMany } = buildService();

    await service.findProducts({ finishId: 'finish-1', segment: 'RESIDENTIAL' });

    const where = findMany.mock.calls[0][0].where as Record<string, unknown>;
    expect(where.finishId).toBe('finish-1');
    expect(where.segments).toEqual({ has: 'RESIDENTIAL' });
  });

  it('always excludes inactive products, whatever the filter', async () => {
    const { service, findMany } = buildService();

    await service.findProducts({ finishId: 'finish-1' });

    const where = findMany.mock.calls[0][0].where as Record<string, unknown>;
    expect(where.active).toBe(true);
  });
});
