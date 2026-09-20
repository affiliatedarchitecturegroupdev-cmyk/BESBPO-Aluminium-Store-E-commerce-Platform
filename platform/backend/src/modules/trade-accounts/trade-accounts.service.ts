import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyTradeAccountDto } from './dto/apply-trade-account.dto';

// Reads and writes take an optional transaction client. When the caller is inside a transaction,
// passing it in is what keeps a credit reservation and the order status that justifies it in one
// atomic unit — see OrdersService.confirmPayment.
type Db = Prisma.TransactionClient;

// A TradeAccount belongs to a Company, which can have many team members (see
// docs/07-trade-accounts-quotes.md and docs/20-business-desk.md) — applying creates
// both the Company and the (unapproved) TradeAccount in one step, with the applying
// user set as OWNER.
@Injectable()
export class TradeAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: Record<string, string>) {
    return this.prisma.tradeAccount.findMany({
      take: 50,
      where: query.approved ? { approved: query.approved === 'true' } : undefined,
      include: { company: true },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.tradeAccount.findUnique({ where: { id }, include: { company: { include: { users: true } } } });
    if (!record) throw new NotFoundException(`TradeAccount ${id} not found`);
    return record;
  }

  async apply(userId: string, dto: ApplyTradeAccountDto) {
    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        registrationNo: dto.registrationNo,
        vatNumber: dto.vatNumber,
        tradeAccount: { create: { approved: false } },
        users: { connect: { id: userId } },
      },
      include: { tradeAccount: true },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { companyRole: 'OWNER', role: 'TRADE' } });
    return company;
  }

  async approve(id: string, creditLimit?: number) {
    return this.prisma.tradeAccount.update({
      where: { id },
      data: {
        approved: true,
        approvedAt: new Date(),
        // Only overwrite the limit when one was supplied; approving an account is not a reason
        // to discard a limit that was already agreed.
        ...(creditLimit === undefined ? {} : { creditLimit }),
      },
    });
  }

  remove(id: string) {
    return this.prisma.tradeAccount.delete({ where: { id } });
  }

  /**
   * Reserves `amount` of credit for a trade-terms order, refusing if the account has no
   * headroom.
   *
   * The check and the increment are a *single* `UPDATE ... WHERE` — not a read followed by a
   * write. Reading `creditUsed`, comparing in JavaScript, then updating leaves a gap in which
   * two concurrent orders both see the same headroom and both commit, pushing the account over
   * its limit. Postgres evaluates the `WHERE` and applies the `INCREMENT` under one row lock, so
   * the loser matches no row and is refused. Same reasoning as CounterService's atomic increment.
   *
   * `creditLimit` null means "no limit set" — that is not the same as a zero limit, and treating
   * it as zero would silently block every account that was approved without a figure.
   */
  async consumeCredit(companyId: string, amount: number, db: Db = this.prisma) {
    if (!(amount > 0)) return;

    const updated = await db.$executeRaw`
      UPDATE "TradeAccount"
      SET "creditUsed" = "creditUsed" + ${amount}
      WHERE "companyId" = ${companyId}
        AND "approved" = true
        AND ("creditLimit" IS NULL OR "creditUsed" + ${amount} <= "creditLimit")
    `;

    if (updated === 0) {
      // Distinguish "not approved" from "over limit" so the buyer gets an actionable message
      // rather than a bare rejection. This read is outside the guarded update by necessity —
      // it only shapes the error, it does not decide anything.
      const account = await db.tradeAccount.findUnique({ where: { companyId } });
      if (!account || !account.approved) {
        throw new BadRequestException('Trade account terms require an approved trade account');
      }
      const limit = account.creditLimit ? Number(account.creditLimit) : null;
      throw new BadRequestException(
        `Insufficient trade credit: R${Number(account.creditUsed).toFixed(2)} of ` +
          `R${limit?.toFixed(2) ?? 'unlimited'} already committed`,
      );
    }

    return { companyId, committed: amount };
  }

  /**
   * Returns reserved credit to the account, floored at zero.
   *
   * Used when a trade-terms order that had reserved credit is cancelled. Without this, credit
   * leaks: a cancelled order keeps its commitment forever and the account slowly wedges itself
   * out of its own limit. The floor guards against a double-release driving `creditUsed`
   * negative, which would extend the buyer's headroom beyond what they were granted.
   */
  async releaseCredit(companyId: string, amount: number, db: Db = this.prisma) {
    if (!(amount > 0)) return;

    await db.$executeRaw`
      UPDATE "TradeAccount"
      SET "creditUsed" = GREATEST("creditUsed" - ${amount}, 0)
      WHERE "companyId" = ${companyId}
    `;
  }

  /** Exposed for callers that need the account for a decision; throws rather than returning null. */
  async findOneByCompany(companyId: string) {
    const account = await this.prisma.tradeAccount.findUnique({ where: { companyId } });
    if (!account) throw new NotFoundException(`No trade account for company ${companyId}`);
    return account;
  }
}
