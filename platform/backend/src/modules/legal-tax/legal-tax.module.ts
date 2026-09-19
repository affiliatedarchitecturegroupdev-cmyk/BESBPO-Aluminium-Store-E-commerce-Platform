import { Module } from '@nestjs/common';
import { LegalTaxController } from './legal-tax.controller';
import { LegalTaxService } from './legal-tax.service';

@Module({
  controllers: [LegalTaxController],
  providers: [LegalTaxService],
  exports: [LegalTaxService],
})
export class LegalTaxModule {}
