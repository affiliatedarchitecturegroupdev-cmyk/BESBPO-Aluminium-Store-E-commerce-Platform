import { Body, Controller, Post } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { QuoteDeliveryDto } from './dto/quote-delivery.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Post('quote')
  quote(@Body() dto: QuoteDeliveryDto) {
    return this.service.quoteDelivery(dto);
  }
}
