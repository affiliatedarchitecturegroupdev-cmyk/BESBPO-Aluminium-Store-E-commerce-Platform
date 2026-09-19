import { IsIn, IsOptional, IsString } from 'class-validator';
import { PROVINCES } from '../../../common/provinces';

export class CreateOrderDto {
  @IsIn(['PAYFAST', 'LULAPAY_BNPL', 'PAYJUSTNOW', 'TRADE_ACCOUNT_TERMS', 'EFT'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  // A free string here reached Prisma's enum-typed column and produced a 500 on every checkout
  // with a province set. Validating at the boundary turns a typo into a 400 the client can show.
  @IsOptional()
  @IsIn(PROVINCES)
  deliveryProvince?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}