import { IsIn, IsNumber, IsOptional, IsString, IsDateString, IsInt } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'])
  type: string;

  @IsNumber()
  value: number;

  @IsOptional() @IsNumber()
  minCartValue?: number;

  @IsOptional() @IsDateString()
  expiresAt?: string;

  @IsOptional() @IsInt()
  usageLimit?: number;
}
