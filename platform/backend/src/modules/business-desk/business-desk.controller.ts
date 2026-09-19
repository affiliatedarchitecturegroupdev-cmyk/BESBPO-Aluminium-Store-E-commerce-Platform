import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { BusinessDeskService } from './business-desk.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { CompanyRoleGuard } from './company-role.guard';
import { RequireCompanyRole } from './company-role.decorator';

// The Business Desk — a self-service portal for Trade/Volume accounts (the "Company"
// model: one company, many team members with OWNER/BUYER/VIEWER roles). Distinct from
// the internal /admin area, which is Aluminium Store staff only.
@UseGuards(JwtAuthGuard)
@Controller('business-desk')
export class BusinessDeskController {
  constructor(private readonly service: BusinessDeskService) {}

  @Get('dashboard')
  dashboard(@Req() req: Request & { user: { id: string } }) {
    return this.service.getDashboard(req.user.id);
  }

  @Get('orders')
  orders(@Req() req: Request & { user: { id: string } }) {
    return this.service.getCompanyOrders(req.user.id);
  }

  @Get('quotes')
  quotes(@Req() req: Request & { user: { id: string } }) {
    return this.service.getCompanyQuotes(req.user.id);
  }

  @Get('statements')
  statements(@Req() req: Request & { user: { id: string } }) {
    return this.service.getStatements(req.user.id);
  }

  @Get('credit')
  credit(@Req() req: Request & { user: { id: string } }) {
    return this.service.getCreditPosition(req.user.id);
  }

  // ---- Team management (OWNER only) ----
  @UseGuards(CompanyRoleGuard)
  @RequireCompanyRole('OWNER')
  @Get('team')
  team(@Req() req: Request & { user: { id: string } }) {
    return this.service.getTeam(req.user.id);
  }

  @UseGuards(CompanyRoleGuard)
  @RequireCompanyRole('OWNER')
  @Post('team/invite')
  invite(@Req() req: Request & { user: { id: string } }, @Body() dto: InviteTeamMemberDto) {
    return this.service.inviteTeamMember(req.user.id, dto);
  }

  @UseGuards(CompanyRoleGuard)
  @RequireCompanyRole('OWNER')
  @Post('team/:memberId/remove')
  removeMember(@Req() req: Request & { user: { id: string } }, @Param('memberId') memberId: string) {
    return this.service.removeTeamMember(req.user.id, memberId);
  }
}
