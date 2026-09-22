import { PartialType } from '@nestjs/mapped-types';
import { CreateProductPairingDto } from './create-product-pairing.dto';

export class UpdateProductPairingDto extends PartialType(CreateProductPairingDto) {}
