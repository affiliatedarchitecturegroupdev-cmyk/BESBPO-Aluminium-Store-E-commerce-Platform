import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CollectionItemDto {
  @IsString()
  @MaxLength(64)
  productId!: string;

  // Why this piece belongs to the theme. Per-item, because a lookbook card set reads better with
  // a line of intent than a bare product list.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateCollectionDto {
  @IsString()
  @MaxLength(120)
  slug!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // "Summer 2026", "Winter Renovation" — free text, since the seasons are a merchandising
  // concept rather than a controlled vocabulary.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  season?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  accentHex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  finishId?: string;

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

  // Membership can be set in the same call that creates the collection, so a lookbook is never
  // briefly live and empty between two requests.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionItemDto)
  items?: CollectionItemDto[];
}
