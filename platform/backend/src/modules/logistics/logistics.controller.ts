import { Controller, Get, Query } from '@nestjs/common';
import { LogisticsService } from './logistics.service';

// Distinct from the `delivery` module (which owns fee/zone calculation) — this module owns
// the courier directory and the PUDO pickup-point network. See docs/24-logistics-integrations.md.
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly service: LogisticsService) {}

  @Get('couriers')
  activeCouriers() {
    return this.service.getActiveCouriers();
  }

  // Map-based pickup-point selector — Pargo / PostNet, filtered by province.
  @Get('pickup-points')
  pickupPoints(@Query('province') province?: string) {
    return this.service.getPickupPoints(province);
  }
}
