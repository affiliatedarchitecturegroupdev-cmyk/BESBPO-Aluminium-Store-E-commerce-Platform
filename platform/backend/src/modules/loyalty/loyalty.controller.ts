import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get()
  myAccount(@Req() req: Request & { user: { id: string } }) {
    return this.service.getOrCreateAccount(req.user.id);
  }

  @Get('history')
  history(@Req() req: Request & { user: { id: string } }) {
    return this.service.getTransactionHistory(req.user.id);
  }
}
