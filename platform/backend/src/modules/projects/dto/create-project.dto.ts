import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsIn(['COMMERCIAL', 'INDUSTRIAL', 'INSTITUTIONAL', 'RESIDENTIAL'])
  sector: string;

  @IsOptional() @IsString()
  categorySlug?: string;

  @IsOptional() @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsArray()
  imageUrls?: string[];
}
