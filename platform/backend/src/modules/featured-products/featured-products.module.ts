import { Module } from '@nestjs/common';
import { FeaturedProductsController } from './featured-products.controller';
import { FeaturedProductsService } from './featured-products.service';

@Module({
  controllers: [FeaturedProductsController],
  providers: [FeaturedProductsService],
  exports: [FeaturedProductsService],
})
export class FeaturedProductsModule {}
