import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { LegalTaxModule } from '../legal-tax/legal-tax.module';
import { AddressesModule } from '../addresses/addresses.module';
import { RolesGuard } from '../admin/roles.guard';

@Module({
  imports: [CartModule, PromotionsModule, LegalTaxModule, AddressesModule],
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
