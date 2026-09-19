import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.faqItem.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  create(dto: CreateFaqItemDto) {
    return this.prisma.faqItem.create({ data: dto });
  }
}
