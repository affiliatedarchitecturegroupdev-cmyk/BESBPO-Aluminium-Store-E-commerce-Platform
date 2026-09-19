import { Module } from '@nestjs/common';
import { CmiRoutingController } from './cmi-routing.controller';
import { CmiRoutingService } from './cmi-routing.service';

@Module({
  controllers: [CmiRoutingController],
  providers: [CmiRoutingService],
  exports: [CmiRoutingService],
})
export class CmiRoutingModule {}
