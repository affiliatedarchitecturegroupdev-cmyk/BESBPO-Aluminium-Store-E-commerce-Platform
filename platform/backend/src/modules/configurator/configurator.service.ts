import { Injectable, HttpException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PriceRequestDto } from './dto/price-request.dto';

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL ?? 'http://pricing-service:8000';

@Injectable()
export class ConfiguratorService {
  constructor(private readonly prisma: PrismaService) {}

  // Calls the FastAPI pricing microservice, which runs the same formulas verified in the
  // Pricing Framework workbook (Area Rate / glazing upgrade / hardware allowance).
  //
  // The client sends IDs (finishId, glazingPackageId); the pricing service keys its
  // assumption tables by NAME (sub-category, category, glazing spec). Resolving that mapping
  // is this service's job — forwarding the raw DTO would 422 on every request.
  async computePrice(dto: PriceRequestDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { subCategory: { include: { category: true } } },
    });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    // GlazingPackage is a standalone catalogue of packages, not a Product relation, so it is
    // resolved by the ID the configurator sent. Falls back to the product's default spec.
    const glazing = dto.glazingPackageId
      ? await this.prisma.glazingPackage.findUnique({ where: { id: dto.glazingPackageId } })
      : null;
    // A glazing package that is not NRCS-approved must not be priceable — the safety-glass
    // approval is a legal gate, not a merchandising flag (docs/10-compliance-documents.md).
    if (glazing && !glazing.nrcsApproved) {
      throw new HttpException('This glazing package is not NRCS-approved for sale', 422);
    }

    const body = {
      productId: product.id,
      subCategory: product.subCategory.name,
      category: product.subCategory.category.name,
      widthMm: dto.widthMm,
      heightMm: dto.heightMm,
      glazingSpec: glazing?.name ?? product.glazingSpec ?? '',
      discountTier: dto.discountTier ?? 'RETAIL',
    };

    const res = await fetch(`${PRICING_SERVICE_URL}/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new HttpException('Pricing service unavailable', 502);
    }
    return res.json();
  }

  // Blocks sizes outside the AAAMSA-tested range for that configuration —
  // a certificate tested at one size does not cover a larger one. Going outside the range
  // routes to the RFQ flow rather than silently pricing an untested size.
  async validateSizeAgainstAAAMSARange(dto: PriceRequestDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) return { valid: false, reason: 'Unknown product' };
    const maxW = product.widthMm ?? 0;
    const maxH = product.heightMm ?? 0;
    const valid = dto.widthMm <= maxW && dto.heightMm <= maxH;
    return valid
      ? { valid: true }
      : { valid: false, reason: 'Outside AAAMSA-tested size range — route to RFQ', suggestRFQ: true };
  }
}
