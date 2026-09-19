import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(userId: string | null, dto: TrackEventDto) {
    return this.prisma.analyticsEvent.create({
      data: {
        userId: userId ?? undefined,
        sessionId: dto.sessionId,
        eventType: dto.eventType,
        metadata: dto.metadata as never,
      },
    });
  }

  findByType(eventType?: string) {
    return this.prisma.analyticsEvent.findMany({
      where: eventType ? { eventType } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  // Convenience wrapper other modules call directly (e.g. cmi-routing logs a
  // "CMI_ROUTED" event) rather than importing PrismaService just for this one write.
  logServerEvent(eventType: string, metadata: Record<string, unknown>, userId?: string) {
    return this.prisma.analyticsEvent.create({ data: { userId, eventType, metadata: metadata as never } });
  }
}
