import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

// Seasonal / Thematic Collections (the Collections section of docs/37-merchandising-sections.md).
//
// A collection is a theme to browse into — a lookbook — not a shelf of directly-comparable
// items, which is the reason it has its own model and its own visual grammar rather than reusing
// Category. The service keeps membership ordered and window-scoped; the lookbook styling itself
// lives in the frontend.
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  // The storefront read: published, inside its season window, with its items in the curator's
  // order. `_count` is returned so a card can show "12 pieces" without a second round trip.
  async findPublished(take = 6) {
    const now = new Date();
    const collections = await this.prisma.collection.findMany({
      where: {
        published: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(take, 24),
      include: {
        finish: true,
        _count: { select: { items: true } },
        // The card shows a preview of the shelf behind the theme; the full membership is the
        // collection page's job, so this is bounded.
        items: {
          orderBy: { sortOrder: 'asc' },
          take: 4,
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
            },
          },
        },
      },
    });

    // A lookbook card with no items behind it is a dead end, so an empty collection is dropped
    // rather than rendered.
    return collections.filter((c) => c._count.items > 0);
  }

  async findBySlug(slug: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        finish: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                subCategory: { include: { category: true } },
              },
            },
          },
        },
      },
    });
    if (!collection) throw new NotFoundException(`Collection "${slug}" not found`);
    return collection;
  }

  findAll() {
    return this.prisma.collection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { items: true } } },
    });
  }

  create(dto: CreateCollectionDto) {
    const { items, ...fields } = dto;
    // Destructured so `items` can become a nested write, then recast for the Prisma input type —
    // the same looseness the other admin CRUD services use, since the DTO already validated the
    // shape and Prisma re-checks the relations.
    const data: Record<string, unknown> = { ...fields };
    // Nested create keeps the collection and its membership in one statement, so it is never
    // briefly live and empty.
    if (items?.length) data.items = { create: items };

    return this.prisma.collection.create({
      data: data as never,
      include: { _count: { select: { items: true } } },
    });
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const existing = await this.prisma.collection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);

    const { items, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      await tx.collection.update({ where: { id }, data: fields as never });
      if (items) {
        // Replacing membership wholesale is the only coherent semantic for an ordered set sent
        // in one request: a merge would leave orphaned rows at stale sort positions.
        await tx.collectionItem.deleteMany({ where: { collectionId: id } });
        if (items.length) {
          await tx.collectionItem.createMany({ data: items.map((i) => ({ ...i, collectionId: id })) as never });
        }
      }
      return tx.collection.findUnique({
        where: { id },
        include: { _count: { select: { items: true } } },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.collection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);
    // CollectionItem rows cascade.
    return this.prisma.collection.delete({ where: { id } });
  }
}
