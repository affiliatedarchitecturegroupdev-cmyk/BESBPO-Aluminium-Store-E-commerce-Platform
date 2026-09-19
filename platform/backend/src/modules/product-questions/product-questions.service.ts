import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';

@Injectable()
export class ProductQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  findForProduct(productId: string) {
    // Only answered questions are public — an unanswered question isn't hidden from staff,
    // just not shown to other shoppers until it has a response.
    return this.prisma.productQuestion.findMany({
      where: { productId, answer: { not: null } },
      orderBy: { answeredAt: 'desc' },
    });
  }

  ask(userId: string, productId: string, dto: AskQuestionDto) {
    return this.prisma.productQuestion.create({ data: { userId, productId, question: dto.question } });
  }

  answer(questionId: string, dto: AnswerQuestionDto) {
    return this.prisma.productQuestion.update({
      where: { id: questionId },
      data: { answer: dto.answer, answeredAt: new Date() },
    });
  }
}
