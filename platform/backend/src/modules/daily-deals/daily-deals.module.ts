import { Module } from '@nestjs/common';
import { DailyDealsController } from './daily-deals.controller';
import { DailyDealsService } from './daily-deals.service';

@Module({
  controllers: [DailyDealsController],
  providers: [DailyDealsService],
  exports: [DailyDealsService],
})
export class DailyDealsModule {}
