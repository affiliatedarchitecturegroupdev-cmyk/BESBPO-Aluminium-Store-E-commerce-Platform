import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

// Omnichannel helpdesk — Email / Chat / WhatsApp tickets in one queue.
// See docs/29-crm-helpdesk.md for why this is a scaffold, not a full CRM, in Phase 1.
@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @UseGuards(JwtAuthGuard)
  @Post('tickets')
  create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:id/messages')
  addMessage(@Req() req: Request & { user: { id: string } }, @Param('id') id: string, @Body() dto: AddMessageDto) {
    return this.service.addMessage(id, req.user.id, dto.body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('tickets/open')
  openTickets() {
    return this.service.getOpenTickets();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('tickets/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }
}
