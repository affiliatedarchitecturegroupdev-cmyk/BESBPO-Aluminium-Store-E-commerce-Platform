import { IsNumber, IsOptional, Min } from 'class-validator';

export class ApproveTradeAccountDto {
  /**
   * Credit ceiling for the account, in rands.
   *
   * Optional: approving an account unlocks TRADE pricing, which is a separate decision from
   * granting it credit terms. Omitting the limit approves the pricing tier but leaves the account
   * with **no credit facility** — `TradeAccount.creditLimit` stays null and
   * `TradeAccountsService.consumeCredit` refuses term orders until a figure is agreed. A null
   * limit is never read as "unlimited".
   *
   * Supplying the limit here is what makes credit enforceable at all; without this field every
   * limit would have to be written straight into the database.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;
}