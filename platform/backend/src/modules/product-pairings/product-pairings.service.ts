import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductPairingDto } from './dto/create-product-pairing.dto';
import { UpdateProductPairingDto } from './dto/update-product-pairing.dto';

// "Complete the Project" (the Product Pairings section of docs/37-merchandising-sections.md).
//
// Shown on the product detail page, anchored to the product being viewed. The dashed connecting
// line in the UI ties the anchor to each suggested pairing, making the "goes with" relationship
// explicit rather than presenting another anonymous product row — so the data this service
// returns has to be directional and carry its reason.
@Injectable()
export class ProductPairingsService {
  constructor(private readonly prisma: PrismaService) {}

  // The PDP read. Only the outbound direction (pairs recommended *for* this product), because
  // that is what the anchoring product is asking. A reverse lookup would be a different question.
  async findForProduct(sourceId: string, take = 6) {
    const pairings = await this.prisma.productPairing.findMany({
      where: { sourceId, target: { active: true } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: Math.min(take, 24),
      include: {
        target: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            subCategory: { include: { category: true } },
            finish: true,
          },
        },
      },
    });
    return pairings;
  }

  // Same read, keyed by SKU, which is what the PDP route actually carries.
  async findForSku(sku: string, take = 6) {
    const product = await this.prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (!product) throw new NotFoundException(`Product "${sku}" not found`);
    return this.findForProduct(product.id, take);
  }

  findAll() {
    return this.prisma.productPairing.findMany({
      orderBy: [{ sourceId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        source: { select: { sku: true, name: true } },
        target: { select: { sku: true, name: true } },
      },
    });
  }

  async create(dto: CreateProductPairingDto) {
    // A product paired with itself would render a connecting line back to the product the buyer
    // is already looking at.
    if (dto.sourceId === dto.targetId) {
      throw new BadRequestException('A product cannot be paired with itself');
    }

    // Both sides must exist. The foreign keys would reject a bad id anyway, but with a 500 from
    // the database rather than a message naming which id was wrong.
    const [source, target] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.sourceId }, select: { id: true } }),
      this.prisma.product.findUnique({ where: { id: dto.targetId }, select: { id: true } }),
    ]);
    if (!source) throw new NotFoundException(`Source product ${dto.sourceId} not found`);
    if (!target) throw new NotFoundException(`Target product ${dto.targetId} not found`);

    const existing = await this.prisma.productPairing.findUnique({
      where: { sourceId_targetId: { sourceId: dto.sourceId, targetId: dto.targetId } },
    });
    if (existing) throw new BadRequestException('That pairing already exists');

    return this.prisma.productPairing.create({ data: dto as never });
  }

  async update(id: string, dto: UpdateProductPairingDto) {
    const existing = await this.prisma.productPairing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pairing ${id} not found`);

    // Re-pointing at a different product is a delete plus a create, so the uniqueness rule and
    // the self-pairing check are not bypassed through an update.
    const { sourceId, targetId, ...rest } = dto;
    if (sourceId || targetId) {
      throw new BadRequestException('Pairing endpoints cannot be edited — delete and recreate instead');
    }
    return this.prisma.productPairing.update({ where: { id }, data: rest as never });
  }

  async remove(id: string) {
    const existing = await this.prisma.productPairing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pairing ${id} not found`);
    return this.prisma.productPairing.delete({ where: { id } });
  }

  // ---- Phase 2 stub ------------------------------------------------------------------------
  //
  // A real "frequently bought together" computed from order co-occurrence. Deliberately an empty
  // stub rather than a half-built heuristic: the method returns nothing until there is enough
  // order volume for co-occurrence to be statistically meaningful. The curated
  // findForProduct above is what the PDP reads today, and it is honest about being curation.
  //
  // The signature is defined now so the call site and its fallback do not have to change when
  // this is implemented.
  async getComputedPairings(_sourceId: string, _take = 6): Promise<never[]> {
    return [];
  }
}
