import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertContentBlockDto } from './dto/upsert-content-block.dto';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  findPublished(type?: string) {
    return this.prisma.contentBlock.findMany({
      where: {
        published: true,
        ...(type ? { type: type as never } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAll() {
    return this.prisma.contentBlock.findMany({ orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] });
  }

  upsertContentBlock(dto: UpsertContentBlockDto) {
    return this.prisma.contentBlock.upsert({
      where: { key: dto.key },
      update: { ...dto } as never,
      create: { ...dto } as never,
    });
  }

  setPublished(key: string, published: boolean) {
    return this.prisma.contentBlock.update({ where: { key }, data: { published } });
  }

  removeContentBlock(key: string) {
    return this.prisma.contentBlock.delete({ where: { key } });
  }

  findMedia(tag?: string) {
    return this.prisma.mediaAsset.findMany({
      where: tag ? { tags: { has: tag } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  registerMedia(dto: UploadMediaAssetDto) {
    return this.prisma.mediaAsset.create({ data: dto });
  }
}
