import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { LogProductViewDto } from './dto/log-product-view.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

// Server-side business events only — see docs/34-analytics.md. Client-side behaviour
// tracking (page views, scroll depth, session replay) is PostHog/GA4, not this table.
//
// The two merchandising reads below are public and key off an opaque session id rather than a
// login, so Recently Viewed and Recommended For You work for a guest as well as a buyer. What
// they return is scoped to the caller's own key — an anonymous visitor cannot read another
// session's history because they would have to know its session id.
//
// They carry OptionalJwtAuthGuard rather than no guard at all: a signed-in buyer's history should
// follow their account across devices, which requires req.user to be populated, while a guest
// must still be served. Without the guard the account path is unreachable.
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('events')
  track(@Req() req: Request & { user?: { id: string } }, @Body() dto: TrackEventDto) {
    return this.service.track(req.user?.id ?? null, dto);
  }

  // The PDP calls this on mount. Separate from POST /events so the productId is validated as a
  // string rather than being trusted out of a free-form metadata blob.
  @UseGuards(OptionalJwtAuthGuard)
  @Post('product-view')
  logProductView(@Req() req: Request & { user?: { id: string } }, @Body() dto: LogProductViewDto) {
    return this.service.logProductView(dto.productId, {
      userId: req.user?.id ?? null,
      sessionId: dto.sessionId ?? null,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('recently-viewed')
  recentlyViewed(
    @Req() req: Request & { user?: { id: string } },
    @Query('sessionId') sessionId?: string,
    @Query('take') take?: string,
  ) {
    return this.service.getRecentlyViewed({
      userId: req.user?.id ?? null,
      sessionId: sessionId ?? null,
      take: Number(take) || 8,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('recommended')
  recommended(
    @Req() req: Request & { user?: { id: string } },
    @Query('sessionId') sessionId?: string,
    @Query('take') take?: string,
  ) {
    return this.service.getRecommendedFor({
      userId: req.user?.id ?? null,
      sessionId: sessionId ?? null,
      take: Number(take) || 8,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('events')
  findByType(@Query('eventType') eventType?: string) {
    return this.service.findByType(eventType);
  }
}
