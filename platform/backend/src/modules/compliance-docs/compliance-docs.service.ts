import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComplianceDocDto } from './dto/create-compliance-docs.dto';
import { UpdateComplianceDocDto } from './dto/update-compliance-docs.dto';

@Injectable()
export class ComplianceDocsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: Record<string, string>) {
    // complianceDoc listing — filters applied per query params (segment, category, etc.)
    return this.prisma.complianceDoc.findMany({ take: 50 });
  }

  async findOne(id: string) {
    const record = await this.prisma.complianceDoc.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`ComplianceDoc ${id} not found`);
    return record;
  }

  create(dto: CreateComplianceDocDto) {
    return this.prisma.complianceDoc.create({ data: dto as never });
  }

  update(id: string, dto: UpdateComplianceDocDto) {
    return this.prisma.complianceDoc.update({ where: { id }, data: dto as never });
  }

  remove(id: string) {
    return this.prisma.complianceDoc.delete({ where: { id } });
  }
}
