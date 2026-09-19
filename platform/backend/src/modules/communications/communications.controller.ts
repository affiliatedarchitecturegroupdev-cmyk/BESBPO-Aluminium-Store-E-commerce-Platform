import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  // Delivery log for support/ops debugging — "did the customer actually get the WhatsApp?"
  @Get('log')
  log(@Query('userId') userId?: string) {
    return this.service.getLog(userId);
  }
}
