import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { ConfiguratorModule } from '../configurator/configurator.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [ConfiguratorModule, PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
