import { PartialType } from '@nestjs/mapped-types';
import { CreateFeaturedProductDto } from './create-featured-product.dto';

// productId is intentionally not reassignable — moving a pick to a different product is a delete
// plus a create, which keeps the "one pick per product" uniqueness rule honest.
export class UpdateFeaturedProductDto extends PartialType(CreateFeaturedProductDto) {}
