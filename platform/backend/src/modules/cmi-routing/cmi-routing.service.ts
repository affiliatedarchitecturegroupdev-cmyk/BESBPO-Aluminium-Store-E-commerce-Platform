import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RouteOrderDto } from './dto/route-order.dto';

const DEFAULT_HUB_CAPACITY_M2 = 150; // see docs/17-open-questions.md — confirm with Fortune

@Injectable()
export class CmiRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  // Filters by province proximity, capability match, and available capacity.
  // "AI proposes, humans approve" — this method never writes the assignment itself.
  async suggestPartners(dto: RouteOrderDto) {
    const candidates = await this.prisma.cMIPartner.findMany({
      where: {
        active: true,
        province: dto.province as never,
        capabilities: { has: dto.requiredCapability },
        nrcsApproved: true,
      },
      orderBy: { capacityM2PerMonth: 'desc' },
      take: 5,
    });
    return {
      thresholdM2: DEFAULT_HUB_CAPACITY_M2,
      exceedsHubCapacity: dto.areaM2 > DEFAULT_HUB_CAPACITY_M2,
      candidates,
    };
  }

  async confirmRouting(orderId: string, partnerId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { cmiPartnerId: partnerId, status: 'ROUTED_TO_CMI_PARTNER' },
    });
  }

  // Storefront-view of the network: who is vetted and what they can build, nothing commercially
  // sensitive. Selecting an explicit `select` rather than returning the row also keeps future
  // columns (rates, SLAs) from leaking onto a public page by default.
  async listPublicPartners() {
    return this.prisma.cMIPartner.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        province: true,
        capabilities: true,
        vettedSince: true,
        nrcsApproved: true,
        aaamsaMember: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
