import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyTradeAccountDto } from './dto/apply-trade-account.dto';

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

  async approve(id: string) {
    return this.prisma.tradeAccount.update({ where: { id }, data: { approved: true, approvedAt: new Date() } });
  }

  remove(id: string) {
    return this.prisma.tradeAccount.delete({ where: { id } });
  }
}
