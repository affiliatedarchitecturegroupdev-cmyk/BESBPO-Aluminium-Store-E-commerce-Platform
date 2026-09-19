import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        channel: dto.channel as never,
        chatSessionId: dto.chatSessionId,
        priority: (dto.priority as never) ?? 'NORMAL',
      },
    });
  }

  addMessage(ticketId: string, senderId: string, body: string) {
    return this.prisma.supportMessage.create({ data: { ticketId, senderId, body } });
  }

  getOpenTickets() {
    return this.prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'PENDING_CUSTOMER'] } },
      include: { user: { select: { name: true, email: true } }, messages: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.supportTicket.update({ where: { id }, data: { status: status as never } });
  }

  // Called by the AI agent module when a ChatSession escalates — creates the human-facing
  // ticket and links it back to the chat transcript so a support agent has full context.
  createFromChatEscalation(userId: string, chatSessionId: string, subject: string) {
    return this.prisma.supportTicket.create({
      data: { userId, subject, channel: 'CHAT', chatSessionId, priority: 'NORMAL' },
    });
  }
}
