import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const [orders, quotes, pendingTrade] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.quote.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.tradeAccount.count({ where: { approved: false } }),
    ]);
    return { orders, openQuotes: quotes, pendingTradeAccounts: pendingTrade };
  }

  getPendingTradeAccounts() {
    // TradeAccount hangs off Company (one company, many team members), not directly off
    // User — so the queue shows the company and its applying team members, not a single user.
    return this.prisma.tradeAccount.findMany({
      where: { approved: false },
      include: { company: { include: { users: { select: { id: true, name: true, email: true, companyRole: true } } } } },
    });
  }

  getQuotesNeedingReview() {
    return this.prisma.quote.findMany({ where: { status: 'SUBMITTED' }, include: { items: true } });
  }
}
