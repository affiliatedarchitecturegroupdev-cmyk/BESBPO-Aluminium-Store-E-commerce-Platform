import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

// Reviews are tied to a verified purchase: only a buyer with an OrderItem for the product
// may review it. No anonymous reviews — consistent with reducing fake-review risk on a
// B2B-leaning platform (docs/14-reviews-notifications.md).
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findForProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Latest reviews across the catalogue — powers the storefront reviews carousel.
  findLatest(take = 6) {
    return this.prisma.review.findMany({
      include: { user: { select: { name: true } }, product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 24),
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId: dto.productId, order: { userId, status: { not: 'CANCELLED' } } },
      select: { id: true },
    });
    if (!purchased) {
      throw new ForbiddenException('Only buyers who have ordered this product can review it');
    }

    const existing = await this.prisma.review.findFirst({ where: { productId: dto.productId, userId } });
    if (existing) throw new BadRequestException('You have already reviewed this product');

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
        photoUrls: dto.photoUrls ?? [],
      },
    });
  }
}