import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { LegalTaxService } from './legal-tax.service';
import { AcceptLegalDocumentDto } from './dto/accept-legal-document.dto';
import { CreateDsarRequestDto } from './dto/create-dsar-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

// ECTA / POPIA / PAIA / CPA / SARS-facing endpoints. See docs/23-legal-tax-compliance.md.
@Controller('legal')
export class LegalTaxController {
  constructor(private readonly service: LegalTaxService) {}

  // Public — the current published version of any legal page (terms, privacy, paia-manual, etc.)
  @Get(':slug')
  getPublished(@Param('slug') slug: string) {
    return this.service.getPublishedBySlug(slug);
  }

  // Recorded at checkout — which exact version of Terms the buyer accepted, and when.
  @UseGuards(JwtAuthGuard)
  @Post('accept')
  accept(@Req() req: Request & { user: { id: string } }, @Body() dto: AcceptLegalDocumentDto) {
    return this.service.recordAcceptance(req.user.id, dto);
  }

  // POPIA Data Subject Access Request self-service — access, correction, or deletion.
  @UseGuards(JwtAuthGuard)
  @Post('dsar')
  submitDsar(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateDsarRequestDto) {
    return this.service.submitDsarRequest(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('dsar/pending')
  pendingDsar() {
    return this.service.getPendingDsarRequests();
  }

  // Invoice — SARS-compliant Tax Invoice for a given order.
  @UseGuards(JwtAuthGuard)
  @Get('invoice/:orderId')
  getInvoice(@Param('orderId') orderId: string) {
    return this.service.getOrGenerateInvoice(orderId);
  }
}
