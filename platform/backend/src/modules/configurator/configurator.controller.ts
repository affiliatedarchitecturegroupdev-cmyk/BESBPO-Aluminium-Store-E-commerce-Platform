import { Body, Controller, Post } from '@nestjs/common';
import { ConfiguratorService } from './configurator.service';
import { PriceRequestDto } from './dto/price-request.dto';

@Controller('configurator')
export class ConfiguratorController {
  constructor(private readonly service: ConfiguratorService) {}

  // Live price lookup as the buyer adjusts size / finish / glazing.
  // Proxies to the FastAPI pricing microservice — see docs/05-pricing-integration.md
  @Post('price')
  price(@Body() dto: PriceRequestDto) {
    return this.service.computePrice(dto);
  }

  @Post('validate-size')
  validateSize(@Body() dto: PriceRequestDto) {
    return this.service.validateSizeAgainstAAAMSARange(dto);
  }
}
