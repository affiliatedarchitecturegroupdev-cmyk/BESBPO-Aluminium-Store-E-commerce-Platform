import { IsBoolean, IsIn, IsNumber } from 'class-validator';
import { PROVINCES } from '../../../common/provinces';

export class QuoteDeliveryDto {
  @IsIn(PROVINCES)
  province: string;

  @IsNumber()
  weightKg: number;

  @IsBoolean()
  isFragile: boolean;
}
