-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- Backfill from documents that already exist, so an environment upgrading with live data
-- does not restart numbering at 1 and collide with / reuse an issued order or invoice number.
-- Order numbers embed YYMMDD; invoice numbers embed the year. Casting to INTEGER before MAX()
-- is what makes the seed the numeric high-water mark rather than the lexicographic one.
INSERT INTO "Counter" ("key", "value", "updatedAt")
SELECT 'order:' || split_part("orderNumber", '-', 2),
       MAX(split_part("orderNumber", '-', 3)::INTEGER),
       NOW()
FROM "Order"
WHERE split_part("orderNumber", '-', 3) ~ '^[0-9]+$'
GROUP BY split_part("orderNumber", '-', 2)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Counter" ("key", "value", "updatedAt")
SELECT 'invoice:' || split_part("invoiceNumber", '-', 3),
       MAX(split_part("invoiceNumber", '-', 4)::INTEGER),
       NOW()
FROM "Invoice"
WHERE split_part("invoiceNumber", '-', 4) ~ '^[0-9]+$'
GROUP BY split_part("invoiceNumber", '-', 3)
ON CONFLICT ("key") DO NOTHING;
