import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // Featured projects populate the hero slider specifically — not every project qualifies,
  // keeping the slider curated rather than showing every case study ever logged.
  getFeatured() {
    return this.prisma.project.findMany({
      where: { featured: true },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { completedAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.project.findMany({
      include: { images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { completedAt: 'desc' },
    });
  }

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description,
        sector: dto.sector as never,
        categorySlug: dto.categorySlug,
        featured: dto.featured ?? false,
        images: dto.imageUrls
          ? { create: dto.imageUrls.map((url, i) => ({ url, sortOrder: i })) }
          : undefined,
      },
      include: { images: true },
    });
  }
}
