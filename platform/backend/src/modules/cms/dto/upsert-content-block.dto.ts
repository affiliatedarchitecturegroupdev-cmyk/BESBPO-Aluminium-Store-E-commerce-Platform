import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const CONTENT_TYPES = ['HERO_SLIDE', 'PROMO_BANNER', 'CATEGORY_FEATURE', 'ANNOUNCEMENT', 'SEO_METADATA'];

export class UpsertContentBlockDto {
  @IsString()
  key: string;

  @IsIn(CONTENT_TYPES)
  type: string;

  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString()
  linkUrl?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  published?: boolean;
}
