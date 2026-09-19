import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFaqItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsString()
  category: string;

  @IsOptional() @IsInt()
  sortOrder?: number;
}
