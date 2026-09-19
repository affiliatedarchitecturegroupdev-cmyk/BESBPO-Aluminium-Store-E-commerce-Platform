import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';

@Injectable()
export class BusinessDeskService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId) throw new NotFoundException('No company associated with this account');
    return user.companyId;
  }

  async getDashboard(userId: string) {
    const companyId = await this.requireCompanyId(userId);
    const [tradeAccount, openOrders, openQuotes, teamCount] = await Promise.all([
      this.prisma.tradeAccount.findUnique({ where: { companyId } }),
      this.prisma.order.count({ where: { user: { companyId }, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      this.prisma.quote.count({ where: { user: { companyId }, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'QUOTED'] } } }),
      this.prisma.user.count({ where: { companyId } }),
    ]);
    return {
      discountTier: tradeAccount?.discountTier ?? 'RETAIL',
      creditLimit: tradeAccount?.creditLimit ?? null,
      creditUsed: tradeAccount?.creditUsed ?? 0,
      openOrders,
      openQuotes,
      teamCount,
    };
  }

  async getCompanyOrders(userId: string) {
    const companyId = await this.requireCompanyId(userId);
    return this.prisma.order.findMany({
      where: { user: { companyId } },
      include: { items: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyQuotes(userId: string) {
    const companyId = await this.requireCompanyId(userId);
    return this.prisma.quote.findMany({
      where: { user: { companyId } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatements(userId: string) {
    const companyId = await this.requireCompanyId(userId);
    return this.prisma.statement.findMany({ where: { companyId }, orderBy: { periodStart: 'desc' } });
  }

  async getCreditPosition(userId: string) {
    const companyId = await this.requireCompanyId(userId);
    const account = await this.prisma.tradeAccount.findUnique({ where: { companyId } });
    if (!account) return { creditLimit: null, creditUsed: 0, available: null };
    const limit = account.creditLimit ? Number(account.creditLimit) : null;
    const used = Number(account.creditUsed);
    return { creditLimit: limit, creditUsed: used, available: limit != null ? limit - used : null };
  }

  async getTeam(userId: string) {
    const companyId = await this.requireCompanyId(userId);
    return this.prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, companyRole: true, createdAt: true },
    });
  }

  async inviteTeamMember(userId: string, dto: InviteTeamMemberDto) {
    const companyId = await this.requireCompanyId(userId);
    // email is @unique on User, so re-inviting an address would otherwise surface a raw
    // database error. An address already on this company is a no-op; one on another company
    // is refused rather than silently moved, since that would cross a tenancy boundary.
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      if (existing.companyId === companyId) {
        throw new ConflictException('That person is already on your team');
      }
      if (existing.companyId) {
        throw new ConflictException('That address belongs to another company');
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: { companyId, companyRole: dto.role as never, role: 'TRADE' },
      });
    }
    // Creates a placeholder User pending their own sign-up/OAuth linking on first login —
    // consistent with the six sign-in options in the auth module.
    return this.prisma.user.create({
      data: { email: dto.email, name: dto.name, companyId, companyRole: dto.role as never, role: 'TRADE' },
    });
  }

  async removeTeamMember(actingUserId: string, memberId: string) {
    const companyId = await this.requireCompanyId(actingUserId);
    // The member must belong to the acting OWNER's company. Without this check a valid OWNER
    // of any company could remove a member of any other company by guessing the id.
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.companyId !== companyId) {
      throw new NotFoundException('Team member not found');
    }
    if (member.id === actingUserId) {
      throw new ForbiddenException('You cannot remove yourself from the team');
    }
    return this.prisma.user.update({ where: { id: memberId }, data: { companyId: null, companyRole: null } });
  }
}
