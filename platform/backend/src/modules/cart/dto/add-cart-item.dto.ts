import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// Adding to cart carries the configurator's selections, not a client-supplied price:
// the server recomputes the unit price from the pricing service, so a tampered request
// cannot set its own price (docs/03-configurator-spec.md, docs/05-pricing-integration.md).
export class AddCartItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  widthMm?: number;

  @IsOptional()
  @IsInt()
  heightMm?: number;

  @IsOptional()
  @IsString()
  finishId?: string;

  @IsOptional()
  @IsString()
  glazingPackageId?: string;
}