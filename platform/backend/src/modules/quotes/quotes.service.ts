import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quotes.dto';
import { UpdateQuoteDto } from './dto/update-quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: Record<string, string>) {
    // quote listing — filters applied per query params (segment, category, etc.)
    return this.prisma.quote.findMany({
      take: 50,
      include: { items: true, user: { select: { email: true, company: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findMine(userId: string) {
    return this.prisma.quote.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!record) throw new NotFoundException(`Quote ${id} not found`);
    return record;
  }

  /** Buyer-facing read: a quote carries pricing and project detail, so it is owner-scoped. */
  async findOneForUser(id: string, userId: string) {
    const record = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!record) throw new NotFoundException(`Quote ${id} not found`);
    if (record.userId !== userId) throw new ForbiddenException('Not your quote');
    return record;
  }

  create(userId: string, dto: CreateQuoteDto) {
    // userId comes from the session, never the body — a client must not be able to file a
    // quote against another buyer's account.
    return this.prisma.quote.create({ data: { ...dto, userId } as never });
  }

  // Reads the buyer's current CartItems and re-shapes them as QuoteItem rows on a new
  // Quote — the SKU-exact cart line becomes a free-text description + approxAreaM2 line,
  // since a Quote is a pre-price-freeze RFQ rather than an exact-SKU order (see
  // docs/07-trade-accounts-quotes.md on why Quote and Order are deliberately separate models).
  async createFromCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty — add items before requesting a quote');
    }

    const quoteNumber = `ALS-Q-${Date.now()}`;
    return this.prisma.quote.create({
      data: {
        quoteNumber,
        userId,
        status: 'SUBMITTED',
        items: {
          create: cart.items.map((item) => ({
            description: `${item.product.name} × ${item.quantity}`,
            subCategorySlug: item.product.subCategoryId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  update(id: string, dto: UpdateQuoteDto) {
    return this.prisma.quote.update({ where: { id }, data: dto as never });
  }

  remove(id: string) {
    return this.prisma.quote.delete({ where: { id } });
  }
}
