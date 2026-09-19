import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

// Help Center / FAQ — also the first source the AI agent's knowledge base should be
// seeded from (see docs/30-ai-support-agent.md).
@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.service.findAll(category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateFaqItemDto) {
    return this.service.create(dto);
  }
}
