// Mirrors prisma/schema.prisma's Province enum. Kept as an explicit list rather than importing
// the generated enum so DTOs stay free of @prisma/client — but the two must stay in sync.
// Exported from one place because three DTOs (orders, delivery, cmi-routing) validate against
// it; duplicated copies had already drifted to exclude Free State and Northern Cape.
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