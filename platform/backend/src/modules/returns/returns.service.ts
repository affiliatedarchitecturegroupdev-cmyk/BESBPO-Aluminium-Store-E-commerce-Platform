import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestReturnDto } from './dto/request-return.dto';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  // Enforces ECTA Section 42(2): made-to-order / personalised goods are excluded from the
  // cooling-off/return right. OrderItem.nonReturnable is already set true at order time for
  // any Made-to-Order or CMI Partner Network line (see orders module) — this is the second,
  // server-side gate, not just a UI hint.
  async requestReturn(dto: RequestReturnDto) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: { returnRequest: true },
    });
    if (!orderItem) throw new NotFoundException('Order item not found');
    if (orderItem.returnRequest) throw new BadRequestException('A return request already exists for this item');
    if (orderItem.nonReturnable) {
      // Still recorded, but auto-rejected with the legal reason — never silently dropped,
      // so the buyer gets a clear, logged answer rather than a dead end.
      return this.prisma.returnRequest.create({
        data: {
          orderItemId: dto.orderItemId,
          reason: dto.reason,
          status: 'REJECTED',
          resolvedAt: new Date(),
        },
      });
    }
    return this.prisma.returnRequest.create({
      data: { orderItemId: dto.orderItemId, reason: dto.reason, status: 'REQUESTED' },
    });
  }

  getPending() {
    return this.prisma.returnRequest.findMany({
      where: { status: 'REQUESTED' },
      include: { orderItem: { include: { product: true, order: true } } },
      orderBy: { requestedAt: 'asc' },
    });
  }

  approve(id: string) {
    return this.prisma.returnRequest.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  reject(id: string) {
    return this.prisma.returnRequest.update({ where: { id }, data: { status: 'REJECTED', resolvedAt: new Date() } });
  }

  markRefunded(id: string) {
    return this.prisma.returnRequest.update({ where: { id }, data: { status: 'REFUNDED', resolvedAt: new Date() } });
  }
}
