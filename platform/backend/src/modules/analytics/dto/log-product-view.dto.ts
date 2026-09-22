import { IsOptional, IsString, MaxLength } from 'class-validator';

// Logged by the PDP on mount. `productId` is the cuid primary key, not the SKU: the analytics
// stream joins back to Product by id, and the SKU is not a foreign key.
export class LogProductViewDto {
  @IsString()
  @MaxLength(64)
  productId!: string;

  // Anonymous visitors carry a generated session id; a signed-in buyer's userId comes from the
  // bearer token instead and is never taken from the body.
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}
