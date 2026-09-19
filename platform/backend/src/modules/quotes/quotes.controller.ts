import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quotes.dto';
import { UpdateQuoteDto } from './dto/update-quotes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  // The quote queue is staff-facing — it carries buyers' company and project details, so it
  // must not be readable anonymously (POPIA; docs/23-legal-tax-compliance.md). Buyer-facing
  // quote reads are scoped to the caller in /quotes/mine below.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.service.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Req() req: Request & { user: { id: string } }) {
    return this.service.findMine(req.user.id);
  }

  // Converts the buyer's current cart into a Quote/QuoteItem set — the "Request a Quote
  // Instead" flow at checkout, relative to cart contents. See docs/07-trade-accounts-quotes.md.
  @UseGuards(JwtAuthGuard)
  @Post('from-cart')
  createFromCart(@Req() req: Request & { user: { id: string } }) {
    return this.service.createFromCart(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.service.findOneForUser(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateQuoteDto) {
    return this.service.create(req.user.id, dto);
  }

  // Quote status/pricing is set by staff (an RFQ is answered by a human), so buyer sessions
  // do not get to rewrite a quote.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
