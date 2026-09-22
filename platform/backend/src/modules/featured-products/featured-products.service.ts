import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeaturedProductDto } from './dto/create-featured-product.dto';
import { UpdateFeaturedProductDto } from './dto/update-featured-product.dto';

// Featured / Editor's Picks (the Featured Products section of docs/37-merchandising-sections.md).
//
// The one section with no algorithm behind it — a human decides, and `note` records why. The
// service therefore keeps the curation invariants rather than any scoring logic: at most one
// live hero (enforced by a partial unique index), and a pick that is visible only inside its
// optional scheduling window.
@Injectable()
export class FeaturedProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // The storefront read. Ordered by the curator's own sortOrder, so the section renders in the
  // arrangement the merchandiser chose rather than by recency or popularity.
  //
  // The window is applied in the database rather than filtered afterwards, so a pick scheduled
  // for next month cannot occupy a slot that a live one should take.
  async findPublished(take = 6) {
    const now = new Date();
    return this.prisma.featuredProduct.findMany({
      where: {
        published: true,
        product: { active: true },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      // Hero first, then the curator's order — the magazine layout reads the hero off the front
      // of this list and the supporting column off the rest.
      orderBy: [{ isHero: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(take, 24),
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            subCategory: { include: { category: true } },
          },
        },
      },
    });
  }

  findAll() {
    return this.prisma.featuredProduct.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { product: { select: { sku: true, name: true } } },
    });
  }

  async create(dto: CreateFeaturedProductDto) {
    const existing = await this.prisma.featuredProduct.findUnique({ where: { productId: dto.productId } });
    if (existing) throw new ConflictException(`Product ${dto.productId} is already featured`);

    return this.prisma.$transaction(async (tx) => {
      // The partial unique index would reject a second hero at the database anyway; swapping
      // explicitly here means promoting a new hero demotes the old one rather than failing.
      if (dto.isHero) {
        await tx.featuredProduct.updateMany({ where: { isHero: true }, data: { isHero: false } });
      }
      return tx.featuredProduct.create({
        data: dto as never,
        include: { product: { select: { sku: true, name: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateFeaturedProductDto) {
    const existing = await this.prisma.featuredProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Featured pick ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isHero) {
        await tx.featuredProduct.updateMany({ where: { isHero: true, id: { not: id } }, data: { isHero: false } });
      }
      return tx.featuredProduct.update({ where: { id }, data: dto as never });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.featuredProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Featured pick ${id} not found`);
    return this.prisma.featuredProduct.delete({ where: { id } });
  }
}
