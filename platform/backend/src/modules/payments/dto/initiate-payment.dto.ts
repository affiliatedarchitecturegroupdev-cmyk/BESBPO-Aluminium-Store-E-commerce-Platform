import { IsIn, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  orderId: string;

  @IsIn(['PAYFAST', 'LULAPAY_BNPL', 'PAYJUSTNOW', 'TRADE_ACCOUNT_TERMS', 'EFT'])
  method: string;
}
