-- Adds an explicit clearance markdown to Product, powering the homepage "Clearance Sale"
-- carousel named in the 18-section homepage stack (Technical Product Specification §7.1).
--
-- Why this is a migration and not just a schema change: `prisma migrate deploy` replays committed
-- migrations and does not diff against schema.prisma, so a column added only to the schema is
-- missing on every clean deploy. That is the same failure mode as the 7-vs-9 Province enum and
-- the missing price tiers before it.
--
-- Why the markdown is a stored price rather than a discount percentage: a clearance line is a
-- merchandising decision about specific stock, not a change to the pricing formula. A percentage
-- applied to the tier grid would re-price Retail, Trade and Volume together and shift the
-- workbook-derived trade pricing that the whole catalogue depends on.
ALTER TABLE "Product"
  ADD COLUMN "clearancePrice"  DECIMAL(12, 2),
  ADD COLUMN "clearanceEndsAt" TIMESTAMP(3);

-- A clearance price must be positive and strictly below retail. Without this, a markdown could
-- be set at or above the list price — the storefront would show a struck-through "was" that is
-- not higher than the "now", and a buyer would be told they are saving money on a price rise.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_clearance_below_retail"
  CHECK ("clearancePrice" IS NULL OR ("clearancePrice" > 0 AND "clearancePrice" < "retailPrice"));

CREATE INDEX "Product_clearancePrice_idx" ON "Product"("clearancePrice");