import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDsarRequestDto {
  @IsIn(['ACCESS', 'CORRECTION', 'DELETION'])
  type: string;

  @IsOptional() @IsString()
  notes?: string;
}
