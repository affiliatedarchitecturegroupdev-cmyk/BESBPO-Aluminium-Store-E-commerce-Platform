import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductPairingDto {
  @IsString()
  @MaxLength(64)
  sourceId!: string;

  @IsString()
  @MaxLength(64)
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
