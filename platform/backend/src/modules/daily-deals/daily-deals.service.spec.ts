import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DailyDealsService } from './daily-deals.service';

// The over-sell guard lives in the SQL predicate (`UPDATE ... WHERE claimed + n <= stockLimit`),
// which a stubbed Prisma cannot truly exercise — scripts/smoke.sh proves it against a real
// database. What matters here is the contract around it: that a zero-row update is a refusal
// rather than a silent success, that the refusal names the actual reason, and that `claimed` is
// never settable through the admin CRUD path.
function buildService(executeRaw: jest.Mock, deal: unknown = null) {
  const prisma = {
    $executeRaw: executeRaw,
    dailyDeal: {
      findUnique: jest.fn().mockResolvedValue(deal),
      update: jest.fn().mockResolvedValue(deal),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return new DailyDealsService(prisma as never);
}

const liveDeal = {
  id: 'd1',
  published: true,
  startsAt: new Date(Date.now() - 3600_000),
  endsAt: new Date(Date.now() + 3600_000),
  stockLimit: 10,
  claimed: 2,
};

describe('DailyDealsService.claim', () => {
  it('treats a matched row as a successful claim', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const service = buildService(executeRaw, { ...liveDeal, claimed: 3 });

    const result = await service.claim('d1', 1);
    expect(result.remaining).toBe(7);
  });

  it('refuses a claim the guarded update did not match', async () => {
    // Zero rows is the only signal that the deal is sold out or closed. Treating it as success
    // would oversell a capped deal — the same defect shape as an unguarded credit reservation.
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, { ...liveDeal, claimed: 10 });

    await expect(service.claim('d1', 1)).rejects.toThrow(BadRequestException);
  });

  it('reports a sold-out deal with the remaining count, not a generic failure', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, { ...liveDeal, stockLimit: 10, claimed: 9 });

    await expect(service.claim('d1', 4)).rejects.toThrow(/Only 1 left/);
  });

  it('distinguishes an ended deal from a sold-out one', async () => {
    // A buyer hitting an expired countdown should be told the deal ended, not told it sold out.
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, {
      ...liveDeal,
      startsAt: new Date(Date.now() - 7200_000),
      endsAt: new Date(Date.now() - 60_000),
      claimed: 0,
    });

    await expect(service.claim('d1', 1)).rejects.toThrow(/has ended/);
  });

  it('distinguishes a not-yet-started deal', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, {
      ...liveDeal,
      startsAt: new Date(Date.now() + 3600_000),
      endsAt: new Date(Date.now() + 7200_000),
      claimed: 0,
    });

    await expect(service.claim('d1', 1)).rejects.toThrow(/not started/);
  });

  it('404s for a deal that does not exist', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, null);

    await expect(service.claim('missing', 1)).rejects.toThrow(NotFoundException);
  });

  it('rejects a non-positive quantity before touching the database', async () => {
    const executeRaw = jest.fn();
    const service = buildService(executeRaw);

    await expect(service.claim('d1', 0)).rejects.toThrow(BadRequestException);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});

describe('DailyDealsService.release', () => {
  it('refuses a release that would drive the counter negative', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw);

    await expect(service.release('d1', 1)).rejects.toThrow(BadRequestException);
  });

  it('reports the released quantity', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const service = buildService(executeRaw);

    await expect(service.release('d1', 2)).resolves.toEqual({ released: 2 });
  });
});

describe('DailyDealsService.update', () => {
  it('keeps claimed out of the curator-editable fields', async () => {
    // `claimed` is moved only by claim()/release(). A curator editing a deal must not be able to
    // reset the sold count and re-sell the same cap.
    const prisma = {
      $executeRaw: jest.fn(),
      dailyDeal: {
        findUnique: jest.fn().mockResolvedValue(liveDeal),
        update: jest.fn().mockResolvedValue(liveDeal),
      },
    };
    const service = new DailyDealsService(prisma as never);

    await service.update('d1', { headline: 'New headline', claimed: 0 } as never);

    const updateArg = prisma.dailyDeal.update.mock.calls[0][0];
    expect(updateArg.data.claimed).toBeUndefined();
    expect(updateArg.data.headline).toBe('New headline');
  });
});

describe('DailyDealsService.findActive', () => {
  it('derives remaining and soldOut so the bar cannot disagree with enforcement', async () => {
    const prisma = {
      dailyDeal: {
        findMany: jest.fn().mockResolvedValue([
          { ...liveDeal, stockLimit: 5, claimed: 5, endsAt: new Date(Date.now() + 60_000), product: {} },
          { ...liveDeal, id: 'd2', stockLimit: 5, claimed: 1, endsAt: new Date(Date.now() + 60_000), product: {} },
        ]),
      },
    };
    const service = new DailyDealsService(prisma as never);

    const result = await service.findActive();
    expect(result[0]).toMatchObject({ remaining: 0, soldOut: true });
    expect(result[1]).toMatchObject({ remaining: 4, soldOut: false });
    expect(result[0].msRemaining).toBeGreaterThan(0);
  });
});
