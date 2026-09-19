import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

// Server-side business events only — see docs/34-analytics.md. Client-side behaviour
// tracking (page views, scroll depth, session replay) is PostHog/GA4, not this table.
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('events')
  track(@Req() req: Request & { user?: { id: string } }, @Body() dto: TrackEventDto) {
    return this.service.track(req.user?.id ?? null, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('events')
  findByType(@Query('eventType') eventType?: string) {
    return this.service.findByType(eventType);
  }
}
