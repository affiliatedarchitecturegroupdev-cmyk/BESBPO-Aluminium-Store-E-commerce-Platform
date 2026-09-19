import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  authorName: string;

  @IsOptional() @IsArray()
  tags?: string[];
}
