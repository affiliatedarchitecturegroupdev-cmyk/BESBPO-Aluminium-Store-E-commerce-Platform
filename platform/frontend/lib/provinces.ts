// The nine South African provinces, mirroring the backend's Province enum
// (platform/backend/src/common/provinces.ts, validated against src/common/provinces.spec.ts).
//
// The checkout form previously carried its own hand-copied array and it had drifted to seven,
// silently dropping Free State and Northern Cape — a shopper in either was charged Gauteng
// delivery, and the backend enum only grew to nine later (migration
// 20260919170000_add_free_state_and_northern_cape_provinces). Both ends must list all nine;
// the storefront e2e test asserts the form offers nine options to catch future drift.
export const PROVINCES = [
  'GAUTENG',
  'KWAZULU_NATAL',
  'WESTERN_CAPE',
  'EASTERN_CAPE',
  'FREE_STATE',
  'LIMPOPO',
  'MPUMALANGA',
  'NORTH_WEST',
  'NORTHERN_CAPE',
] as const;

export type ProvinceCode = (typeof PROVINCES)[number];

/** `NORTH_WEST` -> `North West`, for display in a `<select>`. */
export function provinceLabel(province: string): string {
  return province
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}