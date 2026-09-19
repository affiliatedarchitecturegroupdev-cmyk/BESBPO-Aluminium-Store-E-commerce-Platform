import { IsIn, IsNumber, IsString } from 'class-validator';
import { PROVINCES } from '../../../common/provinces';

export class RouteOrderDto {
  @IsString()
  orderId: string;

  @IsNumber()
  areaM2: number;

  @IsString()
  requiredCapability: string; // e.g. "Curtain Walling", "Shopfront Systems"

  @IsIn(PROVINCES)
  province: string;
}
