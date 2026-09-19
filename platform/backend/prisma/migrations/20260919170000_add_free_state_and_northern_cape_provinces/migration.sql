-- The Phase 1 init migration created the Province enum with 7 values, but schema.prisma and
-- src/common/provinces.ts both declare 9. FREE_STATE and NORTHERN_CAPE were added to the schema
-- without a migration, so `prisma migrate deploy` on a clean database produced a 7-value enum and
-- prisma/seed.ts failed immediately on the first Free State delivery zone. `migrate deploy` only
-- replays committed migrations; it does not diff against the schema, so this never surfaced locally
-- on a database that had been created with `migrate dev`.
--
-- This adds the two missing labels. ALTER TYPE ... ADD VALUE is not transactional, so each value
-- is added in its own statement and neither is referenced in this migration.
ALTER TYPE "Province" ADD VALUE IF NOT EXISTS 'FREE_STATE';
ALTER TYPE "Province" ADD VALUE IF NOT EXISTS 'NORTHERN_CAPE';