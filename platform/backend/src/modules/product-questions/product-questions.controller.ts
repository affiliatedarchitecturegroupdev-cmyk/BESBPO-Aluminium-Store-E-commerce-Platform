import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ProductQuestionsService } from './product-questions.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('products/:productId/questions')
export class ProductQuestionsController {
  constructor(private readonly service: ProductQuestionsService) {}

  @Get()
  findForProduct(@Param('productId') productId: string) {
    return this.service.findForProduct(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  ask(@Req() req: Request & { user: { id: string } }, @Param('productId') productId: string, @Body() dto: AskQuestionDto) {
    return this.service.ask(req.user.id, productId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':questionId/answer')
  answer(@Param('questionId') questionId: string, @Body() dto: AnswerQuestionDto) {
    return this.service.answer(questionId, dto);
  }
}
