import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Writes are ADMIN/STAFF only (the controller enforces it), but a validated shape matters for a
// second reason: `create` previously passed the raw body straight to Prisma, so an admin typo or
// an unexpected key surfaced as an opaque 500 and the caller had no idea which field was wrong.
// Unknown keys are rejected here instead of reaching the database.
const UNIT_OF_SALE = ['EACH', 'PER_LINEAR_METRE', 'PER_M2', 'PER_SET', 'PER_PACK'] as const;
const FULFILMENT_TYPE = ['STOCK', 'MADE_TO_ORDER', 'CMI_PARTNER_NETWORK'] as const;

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  subCategoryId: string;

  @IsString()
  configuration: string;

  @IsIn(UNIT_OF_SALE)
  unitOfSale: string;

  @IsIn(FULFILMENT_TYPE)
  fulfilmentType: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseCost: number;

  // The three customer-facing tiers. Admin-created products must carry a retail price, because a
  // product with no retail price is unpriced rather than free — the cart refuses to price it and
  // the database CHECK constraint rejects it. baseCost alone is not sufficient to sell.
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  markupPct: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  retailPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tradePrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  volumePrice: number;

  @IsOptional()
  @IsString()
  frameClass?: string;

  @IsOptional()
  @IsString()
  standardSize?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightMm?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  lengthM?: number;

  @IsOptional()
  @IsString()
  finishId?: string;

  @IsOptional()
  @IsString()
  glazingSpec?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  feedExcluded?: boolean;
}
