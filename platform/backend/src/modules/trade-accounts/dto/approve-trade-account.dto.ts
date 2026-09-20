import { IsNumber, IsOptional, Min } from 'class-validator';

export class ApproveTradeAccountDto {
  /**
   * Credit ceiling for the account, in rands.
   *
   * Optional because an account can be approved before its limit is agreed, and `null` means
   * "no limit set" rather than zero — see TradeAccountsService.consumeCredit. Supplying it here
   * is what makes the limit enforceable at all; without a way to set it, every approved account
   * would have to be edited in the database directly.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;
}