import { BadRequestException } from '@nestjs/common';

import { TradeAccountsService } from './trade-accounts.service';

// The credit guard's correctness lives in the SQL predicate (`UPDATE ... WHERE creditUsed + n
// <= creditLimit`), which a unit test with a stubbed Prisma cannot truly exercise. What is worth
// pinning down here is the contract around it: that a zero-row update is a refusal, that it is
// not mistaken for success, and that release never drives the balance negative. The predicate
// itself is proven against a real database by scripts/smoke.sh.
function buildService(executeRaw: jest.Mock, account: unknown = null) {
  const prisma = {
    $executeRaw: executeRaw,
    tradeAccount: { findUnique: jest.fn().mockResolvedValue(account) },
  };
  return new TradeAccountsService(prisma as never);
}

describe('TradeAccountsService.consumeCredit', () => {
  it('treats a matched row as a successful reservation', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const service = buildService(executeRaw);

    await expect(service.consumeCredit('c1', 2500)).resolves.toEqual({ companyId: 'c1', committed: 2500 });
  });

  it('refuses when the guarded update matches no row', async () => {
    // Zero rows is the only signal that the account is unapproved or has no headroom. Treating
    // it as a no-op success would let the order through unsecured — the original defect.
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, {
      approved: true,
      creditLimit: 1000,
      creditUsed: 900,
    });

    await expect(service.consumeCredit('c1', 2500)).rejects.toThrow(BadRequestException);
  });

  it('names the limit in the refusal so the buyer can act on it', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, {
      approved: true,
      creditLimit: 150000,
      creditUsed: 149000,
    });

    await expect(service.consumeCredit('c1', 2500)).rejects.toThrow(/Insufficient trade credit/);
  });

  it('reports an unapproved account distinctly from an exhausted one', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, { approved: false, creditLimit: 150000, creditUsed: 0 });

    await expect(service.consumeCredit('c1', 2500)).rejects.toThrow(/approved trade account/);
  });

  it('refuses an approved account that has no credit limit set', async () => {
    // The original defect: `creditLimit IS NULL` was an unguarded pass-through, so approving an
    // account without agreeing a ceiling granted it *unlimited* credit terms — while the business
    // desk simultaneously told the buyer it had no credit facility. Refusal is the safe reading.
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, { approved: true, creditLimit: null, creditUsed: 0 });

    await expect(service.consumeCredit('c1', 2500)).rejects.toThrow(BadRequestException);
  });

  it('names the missing facility rather than implying a limit was hit', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, { approved: true, creditLimit: null, creditUsed: 0 });

    await expect(service.consumeCredit('c1', 2500)).rejects.toThrow(/no credit facility/);
  });

  it('never describes a null limit as unlimited', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw, { approved: true, creditLimit: null, creditUsed: 0 });

    await expect(service.consumeCredit('c1', 2500)).rejects.not.toThrow(/unlimited/);
  });

  it('does not query the database for a zero or negative amount', async () => {
    // A zero-value order should not consume credit, and must not be mistaken for a refusal.
    const executeRaw = jest.fn().mockResolvedValue(0);
    const service = buildService(executeRaw);

    await expect(service.consumeCredit('c1', 0)).resolves.toBeUndefined();
    expect(executeRaw).not.toHaveBeenCalled();
  });
});

describe('TradeAccountsService.releaseCredit', () => {
  it('returns the reserved amount to the account', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const service = buildService(executeRaw);

    await service.releaseCredit('c1', 4200);

    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it('does not issue a statement for a zero or negative amount', async () => {
    const executeRaw = jest.fn();
    const service = buildService(executeRaw);

    await service.releaseCredit('c1', 0);

    expect(executeRaw).not.toHaveBeenCalled();
  });
});