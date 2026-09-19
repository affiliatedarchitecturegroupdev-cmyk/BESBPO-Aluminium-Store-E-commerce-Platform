import { IsInt, IsOptional, IsString } from 'class-validator';

export class PriceRequestDto {
  @IsString()
  productId: string;

  @IsInt()
  widthMm: number;

  @IsInt()
  heightMm: number;

  @IsString()
  finishId: string;

  @IsString()
  glazingPackageId: string;

  @IsOptional()
  @IsString()
  discountTier?: 'RETAIL' | 'TRADE' | 'VOLUME';
}
