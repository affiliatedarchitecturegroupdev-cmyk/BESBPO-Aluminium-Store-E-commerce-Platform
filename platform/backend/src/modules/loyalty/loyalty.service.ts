import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Tier thresholds are a starting-point assumption, not a confirmed business decision —
// flag in docs/31-marketing-engine.md for Fortune to set real numbers before launch.
const TIER_THRESHOLDS: Record<string, number> = { BRONZE: 0, SILVER: 5000, GOLD: 20000, PLATINUM: 50000 };
const POINTS_PER_RAND = 1; // 1 point per R1 spent — same placeholder-assumption caveat as above

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateAccount(userId: string) {
    const existing = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.loyaltyAccount.create({ data: { userId } });
  }

  getTransactionHistory(userId: string) {
    return this.prisma.loyaltyTransaction.findMany({
      where: { loyaltyAccount: { userId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Called by the orders module on order completion — awards points and re-evaluates tier.
  // Kept here (not duplicated in orders.service.ts) so tier/points logic has one owner,
  // per the module-boundary rule in AGENTS.md.
  async awardPointsForOrder(userId: string, orderTotal: number, orderNumber: string) {
    const account = await this.getOrCreateAccount(userId);
    const points = Math.floor(orderTotal * POINTS_PER_RAND);
    await this.prisma.loyaltyTransaction.create({
      data: { loyaltyAccountId: account.id, points, reason: `Order ${orderNumber}` },
    });
    const newBalance = account.pointsBalance + points;
    const newTier = this.tierForBalance(newBalance);
    return this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { pointsBalance: newBalance, tier: newTier as never },
    });
  }

  private tierForBalance(balance: number): string {
    if (balance >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
    if (balance >= TIER_THRESHOLDS.GOLD) return 'GOLD';
    if (balance >= TIER_THRESHOLDS.SILVER) return 'SILVER';
    return 'BRONZE';
  }
}
