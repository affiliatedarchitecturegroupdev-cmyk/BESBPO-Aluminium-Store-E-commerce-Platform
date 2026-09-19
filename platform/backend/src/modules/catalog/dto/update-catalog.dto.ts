import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-catalog.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
