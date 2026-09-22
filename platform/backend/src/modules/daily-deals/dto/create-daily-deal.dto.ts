import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateDailyDealDto {
  @IsString()
  @MaxLength(64)
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  dealPrice!: number;

  // The cap the progress bar displays and claim() enforces server-side.
  @IsInt()
  @IsPositive()
  stockLimit!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
