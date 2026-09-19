import { IsString } from 'class-validator';

export class AcceptLegalDocumentDto {
  @IsString()
  legalDocumentId: string;
}
