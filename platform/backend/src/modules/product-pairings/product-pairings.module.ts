import { Module } from '@nestjs/common';
import { ProductPairingsController } from './product-pairings.controller';
import { ProductPairingsService } from './product-pairings.service';

@Module({
  controllers: [ProductPairingsController],
  providers: [ProductPairingsService],
  exports: [ProductPairingsService],
})
export class ProductPairingsModule {}
