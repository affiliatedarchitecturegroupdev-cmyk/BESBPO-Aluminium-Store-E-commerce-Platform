import { Module } from '@nestjs/common';
import { ComplianceDocsController } from './compliance-docs.controller';
import { ComplianceDocsService } from './compliance-docs.service';

@Module({
  controllers: [ComplianceDocsController],
  providers: [ComplianceDocsService],
  exports: [ComplianceDocsService],
})
export class ComplianceDocsModule {}
