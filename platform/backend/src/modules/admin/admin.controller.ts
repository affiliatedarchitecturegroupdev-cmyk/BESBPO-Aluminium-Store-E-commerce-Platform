import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.getDashboardSummary();
  }

  @Get('trade-accounts/pending')
  pendingTradeAccounts() {
    return this.service.getPendingTradeAccounts();
  }

  @Get('quotes/needing-review')
  quotesNeedingReview() {
    return this.service.getQuotesNeedingReview();
  }
}
