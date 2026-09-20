-- Adds the three customer-facing price tiers to Product, plus frameClass.
--
-- Why this is a migration and not just a schema change: `prisma migrate deploy` replays
-- committed migrations and does not diff against schema.prisma, so a column added only to the
-- schema is missing on every clean deploy (the same failure mode as the 7-vs-9 Province enum).
--
-- Why the tiers live on the product at all: the platform previously had no retail price column,
-- so the storefront rendered `baseCost` as the customer price and the cart, for every
-- sub-category the pricing service cannot compute, sold at baseCost. baseCost is the wholesale
-- cost build-up, so both were publishing cost rather than price. The Pricing Framework workbook
-- is the authoritative source for Retail/Trade/Volume, and scripts/import-catalogue.py carries
-- them across.
--
-- NOT NULL without a default would fail on the 33 existing rows, so the columns are added with
-- defaults and the defaults are then dropped: seed data is fully replaced by the workbook
-- import, and any row left at 0 is visibly unpriced rather than silently free.
ALTER TABLE "Product"
  ADD COLUMN "markupPct"   DECIMAL(6, 4)  NOT NULL DEFAULT 0,
  ADD COLUMN "retailPrice" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tradePrice"  DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "volumePrice" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "frameClass"  TEXT;

ALTER TABLE "Product"
  ALTER COLUMN "markupPct"   DROP DEFAULT,
  ALTER COLUMN "retailPrice" DROP DEFAULT,
  ALTER COLUMN "tradePrice"  DROP DEFAULT,
  ALTER COLUMN "volumePrice" DROP DEFAULT;

-- A priced product must have a positive retail price. This is a database-level guard so that no
-- future import, admin edit or script can reproduce the "cost shown as price" defect by writing
-- a zero.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_retail_price_positive" CHECK ("retailPrice" > 0);
