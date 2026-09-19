import { Module } from '@nestjs/common';
import { ProductQuestionsController } from './product-questions.controller';
import { ProductQuestionsService } from './product-questions.service';

@Module({
  controllers: [ProductQuestionsController],
  providers: [ProductQuestionsService],
  exports: [ProductQuestionsService],
})
export class ProductQuestionsModule {}
