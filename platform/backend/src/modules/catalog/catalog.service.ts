import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-catalog.dto';
import { UpdateProductDto } from './dto/update-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: Record<string, string>) {
    // product listing — filters applied per query params (segment, category, etc.)
    return this.prisma.product.findMany({ take: 50 });
  }

  async findOne(id: string) {
    const record = await this.prisma.product.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Product ${id} not found`);
    return record;
  }

  create(dto: CreateProductDto) {
    // TODO(phase-2): catalogue writes come from the Master Product Catalogue workbook
    // import (docs/04-catalogue-cms.md), not free-form API creates — this stays a cast
    // until that import path exists.
    return this.prisma.product.create({ data: dto as never });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto as never });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
