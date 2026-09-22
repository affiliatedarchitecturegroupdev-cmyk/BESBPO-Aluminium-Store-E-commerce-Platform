import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFeaturedProductDto {
  @IsString()
  @MaxLength(64)
  productId!: string;

  // The curator's own words. This is the value of the section, so it is required and rendered
  // verbatim — not a generated category label.
  @IsString()
  @MaxLength(600)
  note!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  curator?: string;

  // Promotes this pick to the magazine hero and demotes the current one (the service does the
  // swap in one transaction).
  @IsOptional()
  @IsBoolean()
  isHero?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
