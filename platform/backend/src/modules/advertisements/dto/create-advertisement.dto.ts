import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAdvertisementDto {
  @IsInt() @Min(1) @Max(8)
  slot: number;

  @IsString()
  campaignName: string;

  @IsString()
  imageUrl: string;

  @IsString()
  linkUrl: string;

  @IsOptional() @IsDateString()
  startAt?: string;

  @IsOptional() @IsDateString()
  endAt?: string;
}
