import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';

// OrdersModule is imported so trade-terms settlement can delegate to OrdersService.confirmPayment
// — the single place that enforces trade credit. See the comment on initiateTradeTerms.
@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
