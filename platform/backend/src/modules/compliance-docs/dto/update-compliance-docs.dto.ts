import { PartialType } from '@nestjs/mapped-types';
import { CreateComplianceDocDto } from './create-compliance-docs.dto';

export class UpdateComplianceDocDto extends PartialType(CreateComplianceDocDto) {}
