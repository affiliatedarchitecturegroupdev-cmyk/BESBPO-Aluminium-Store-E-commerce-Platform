import { IsArray, IsOptional, IsString } from 'class-validator';

export class UploadMediaAssetDto {
  @IsString()
  url: string;

  @IsString()
  altText: string;

  @IsOptional() @IsArray()
  tags?: string[];

  @IsOptional() @IsString()
  uploadedBy?: string;
}
