import { Body, Controller, Post, Query } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.service.subscribe(dto);
  }

  // One-click unsubscribe link target. Takes a signed token rather than a raw email so that
  // knowing an address is not enough to remove that person from the list — see the service for
  // why (POPIA consent withdrawal).
  @Post('unsubscribe')
  unsubscribe(@Query('token') token: string) {
    return this.service.unsubscribe(token);
  }
}
