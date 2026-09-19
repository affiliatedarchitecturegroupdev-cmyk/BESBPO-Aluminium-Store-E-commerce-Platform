import { Module } from '@nestjs/common';
import { BusinessDeskController } from './business-desk.controller';
import { BusinessDeskService } from './business-desk.service';

@Module({
  controllers: [BusinessDeskController],
  providers: [BusinessDeskService],
  exports: [BusinessDeskService],
})
export class BusinessDeskModule {}
