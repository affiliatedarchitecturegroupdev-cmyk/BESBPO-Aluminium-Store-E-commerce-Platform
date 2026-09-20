import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { PROVINCES } from '../../../common/provinces';

export class CreateAddressDto {
  @IsString()
  @Length(2, 120)
  line1: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  line2?: string;

  @IsString()
  @Length(2, 80)
  city: string;

  @IsIn(PROVINCES)
  province: string;

  // South African postal codes are exactly four digits. Validated here so a typo is a 400 the
  // checkout can show, rather than a courier failing to route the parcel days later.
  @Matches(/^\d{4}$/, { message: 'postalCode must be a 4-digit South African postal code' })
  postalCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}