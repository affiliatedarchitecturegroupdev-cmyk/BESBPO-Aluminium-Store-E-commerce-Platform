-- AlterTable
ALTER TABLE "Finish" ADD COLUMN     "description" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FeaturedProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "curator" TEXT,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "season" TEXT,
    "heroImageUrl" TEXT,
    "accentHex" TEXT,
    "finishId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDeal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "dealPrice" DECIMAL(12,2) NOT NULL,
    "stockLimit" INTEGER NOT NULL,
    "claimed" INTEGER NOT NULL DEFAULT 0,
    "headline" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPairing" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPairing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedProduct_productId_key" ON "FeaturedProduct"("productId");

-- CreateIndex
CREATE INDEX "FeaturedProduct_published_sortOrder_idx" ON "FeaturedProduct"("published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_published_sortOrder_idx" ON "Collection"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_sortOrder_idx" ON "CollectionItem"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_productId_key" ON "CollectionItem"("collectionId", "productId");

-- CreateIndex
CREATE INDEX "DailyDeal_published_endsAt_idx" ON "DailyDeal"("published", "endsAt");

-- CreateIndex
CREATE INDEX "DailyDeal_productId_idx" ON "DailyDeal"("productId");

-- CreateIndex
CREATE INDEX "ProductPairing_sourceId_sortOrder_idx" ON "ProductPairing"("sourceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPairing_sourceId_targetId_key" ON "ProductPairing"("sourceId", "targetId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_occurredAt_idx" ON "AnalyticsEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_sessionId_occurredAt_idx" ON "AnalyticsEvent"("eventType", "sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "Product_finishId_idx" ON "Product"("finishId");

-- CreateIndex
CREATE INDEX "Product_retailPrice_idx" ON "Product"("retailPrice");

-- AddForeignKey
ALTER TABLE "FeaturedProduct" ADD CONSTRAINT "FeaturedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDeal" ADD CONSTRAINT "DailyDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPairing" ADD CONSTRAINT "ProductPairing_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPairing" ADD CONSTRAINT "ProductPairing_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one live hero in the magazine layout. A partial unique index rather than a plain one
-- on ("isHero") so the many supporting picks can all be false — a plain unique would allow only
-- one non-hero row in the whole table.
CREATE UNIQUE INDEX "FeaturedProduct_single_hero"
  ON "FeaturedProduct" ("isHero")
  WHERE "isHero" = true;

-- Deals of the Day: the progress bar reads `claimed`/`stockLimit`, and the countdown reads
-- `endsAt`. The same class of guard the clearance markdown already carries — a capped deal must
-- never be able to describe an impossible state, and `claim()` relies on the cap holding at the
-- database as well as in the service.
ALTER TABLE "DailyDeal"
  ADD CONSTRAINT "DailyDeal_deal_price_positive" CHECK ("dealPrice" > 0),
  ADD CONSTRAINT "DailyDeal_stock_limit_positive" CHECK ("stockLimit" > 0),
  ADD CONSTRAINT "DailyDeal_claimed_not_negative" CHECK ("claimed" >= 0),
  -- The over-sell guard. `claim()` increments `claimed` under a WHERE clause, but this makes an
  -- oversold row unwritable at all, the same defence-in-depth the retail-price check provides.
  ADD CONSTRAINT "DailyDeal_claimed_within_limit" CHECK ("claimed" <= "stockLimit"),
  -- A countdown that has already expired when it starts is not a deal.
  ADD CONSTRAINT "DailyDeal_window_ordered" CHECK ("endsAt" > "startsAt");

