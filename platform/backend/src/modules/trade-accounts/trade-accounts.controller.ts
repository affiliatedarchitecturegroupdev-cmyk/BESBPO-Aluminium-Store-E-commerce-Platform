import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TradeAccountsService } from './trade-accounts.service';
import { ApplyTradeAccountDto } from './dto/apply-trade-account.dto';
import { ApproveTradeAccountDto } from './dto/approve-trade-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('trade-accounts')
export class TradeAccountsController {
  constructor(private readonly service: TradeAccountsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  apply(@Req() req: Request & { user: { id: string } }, @Body() dto: ApplyTradeAccountDto) {
    return this.service.apply(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.service.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveTradeAccountDto) {
    return this.service.approve(id, dto.creditLimit);
  }
}
