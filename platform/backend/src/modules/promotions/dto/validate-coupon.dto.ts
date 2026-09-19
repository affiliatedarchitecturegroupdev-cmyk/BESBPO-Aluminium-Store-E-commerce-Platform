import { IsNumber, IsString } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  cartValue: number;
}
