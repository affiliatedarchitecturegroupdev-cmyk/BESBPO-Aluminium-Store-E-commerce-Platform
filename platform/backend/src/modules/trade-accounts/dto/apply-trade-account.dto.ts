import { IsOptional, IsString } from 'class-validator';

export class ApplyTradeAccountDto {
  @IsString()
  companyName: string;

  @IsOptional() @IsString()
  registrationNo?: string;

  @IsOptional() @IsString()
  vatNumber?: string;
}
