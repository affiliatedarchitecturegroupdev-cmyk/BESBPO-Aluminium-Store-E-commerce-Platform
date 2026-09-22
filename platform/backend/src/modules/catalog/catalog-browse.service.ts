import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CatalogQuery = {
  segment?: string;
  category?: string;
  subCategory?: string;
  search?: string;
  sort?: 'recent' | 'name' | 'price-asc' | 'price-desc';
  take?: string;
  skip?: string;
};

// Read model for the storefront. Category-first browsing is the primary path
// (docs/13-search-filtering.md), with Postgres full-text search as the secondary path —
// 2,147 SKUs sits comfortably inside Postgres FTS, so no external search service in v1.
@Injectable()
export class CatalogBrowseService {
  constructor(private readonly prisma: PrismaService) {}

  findCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { subCategories: true } } },
    });
  }

  async findCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { subCategories: { orderBy: { name: 'asc' } } },
    });
    if (!category) throw new NotFoundException(`Category "${slug}" not found`);
    return category;
  }

  async findSubCategoryBySlug(slug: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!subCategory) throw new NotFoundException(`Sub-category "${slug}" not found`);
    return subCategory;
  }

  async findProducts(q: CatalogQuery) {
    const take = Math.min(Number(q.take) || 60, 120);
    const skip = Number(q.skip) || 0;
    const orderBy = this.orderByFor(q.sort);

    const where = {
      active: true,
      ...(q.segment ? { segments: { has: q.segment as never } } : {}),
      ...(q.category ? { subCategory: { category: { slug: q.category } } } : {}),
      ...(q.subCategory ? { subCategory: { slug: q.subCategory } } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' as const } },
              { configuration: { contains: q.search, mode: 'insensitive' as const } },
              { sku: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        take,
        skip,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          subCategory: { include: { category: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  // Powers the homepage "Clearance Sale" carousel. A row is on clearance only while its
  // clearancePrice is set and its window — if one was given — has not passed; the DATE filter
  // runs in the database rather than being filtered after the fetch, so an expired campaign
  // cannot occupy a slot that a live one should take.
  //
  // Clearance is deliberately independent of the discount tier: a clearance price is the
  // customer-facing markdown, and a trade buyer pays it too rather than a further-discounted
  // tier price. The cart enforces that by charging clearancePrice when it is active.
  async findClearance(take = 8) {
    const items = await this.prisma.product.findMany({
      where: {
        active: true,
        clearancePrice: { not: null },
        OR: [{ clearanceEndsAt: null }, { clearanceEndsAt: { gt: new Date() } }],
      },
      orderBy: { clearanceEndsAt: 'asc' },
      take: Math.min(take, 24),
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        subCategory: { include: { category: true } },
      },
    });
    return { items, total: items.length };
  }

  async findProductBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        finish: true,
        subCategory: { include: { category: true } },
        complianceRefs: true,
        stockLevel: true,
      },
    });
    if (!product) throw new NotFoundException(`Product "${sku}" not found`);
    return product;
  }

  findFinishes() {
    return this.prisma.finish.findMany({ orderBy: { name: 'asc' } });
  }

  findGlazingPackages() {
    // Only NRCS-approved glazing is purchasable — a package whose safety-glass record is
    // not approved must not be selectable in the configurator (docs/10-compliance-documents.md).
    return this.prisma.glazingPackage.findMany({
      where: { nrcsApproved: true },
      orderBy: { name: 'asc' },
    });
  }

  findLocations() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  private orderByFor(sort?: string) {
    switch (sort) {
      case 'recent':
        return { createdAt: 'desc' as const };
      case 'name':
        return { name: 'asc' as const };
      // Price sorting is on retail, not baseCost: shoppers sort by what they pay, and sorting on
      // the cost column would order the catalogue by our margin rather than by price.
      case 'price-asc':
        return { retailPrice: 'asc' as const };
      case 'price-desc':
        return { retailPrice: 'desc' as const };
      default:
        return { name: 'asc' as const };
    }
  }
}