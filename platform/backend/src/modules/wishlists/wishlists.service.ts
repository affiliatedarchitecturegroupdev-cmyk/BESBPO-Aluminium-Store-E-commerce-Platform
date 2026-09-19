import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (existing) return existing;
    return this.prisma.wishlist.create({ data: { userId }, include: { items: true } });
  }

  async addItem(userId: string, dto: AddWishlistItemDto) {
    const wishlist = await this.getOrCreate(userId);
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id: dto.productId } });
    return this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: dto.productId } },
      update: {},
      create: { wishlistId: wishlist.id, productId: dto.productId, priceAtAdd: product.baseCost },
    });
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreate(userId);
    return this.prisma.wishlistItem.delete({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
  }

  // Called by a scheduled job (BullMQ) comparing priceAtAdd to current price — sends a
  // notification via the communications module when notifyOnPriceDrop is true and the
  // price has actually dropped. See docs/26-storefront-ux-extras.md.
  async findPriceDropCandidates() {
    return this.prisma.wishlistItem.findMany({
      where: { notifyOnPriceDrop: true },
      include: { product: true, wishlist: { include: { user: true } } },
    });
  }
}
