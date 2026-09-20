# Catalogue, CMS & Inventory Design

## Source of truth
The **Master Product Catalogue** workbook remains the canonical source for SKU definitions.
The CMS does not let admins invent new SKUs freely; it imports/syncs from an exported version
of the catalogue workbook (CSV/XLSX upload) and only allows editing of merchandising fields
(images, descriptions, sort order, active/inactive) plus stock levels.

## How the catalogue is loaded today
The workbook import is a scripted, out-of-band step — not an admin screen yet:

```
# Regenerate the committed catalogue from the client's workbook (needs openpyxl)
python3 platform/scripts/import-catalogue.py
#   reads   Aluminium-Store-Pricing-Framework-v1.0.xlsx  (repo root)
#   writes  platform/backend/data/catalogue.json
# The seed then reads that JSON:
cd platform/backend && npm run prisma:seed
```

`catalogue.json` is committed, and it records the SHA-256 of the workbook it came from, so the
seeded data is reproducible from the exact workbook revision. `prisma/seed.spec.ts` asserts the
2,147-row count, the SKU format, the taxonomy references, and the price relationships — a corrupt
import fails CI rather than seeding a half-empty storefront.

Adding the admin-facing sync (the XLSX upload described above) is Phase 5 work; until then the
workbook is re-imported by running the script and re-seeding.

## Known pricing issue in the workbook
A flat 20% volume discount applied to markup bands of 18% and 25% puts the volume price of 165
thin-margin commodity rows (144 extrusion, 21 glazing) at or below the cost build-up. This comes
from the workbook's own formulas and is reproduced by the pricing service, so it needs a client
decision rather than a code fix. Retail and trade clear cost on all 2,147 rows. See
`STATUS.md` → Known gaps.

## Why not a third-party CMS
As with Roofsteel and Bricksplaza, a **custom-built admin/CMS** is chosen over Shopify/Strapi/
Sanity-style third-party tools — the configurator, CMI-routing, and compliance-document
attachment logic are specific enough to this business that a generic CMS would need heavy
customisation anyway, and a custom build keeps schema and business logic in one place.

## Inventory model
`StockLevel` is per-product, per-`Location` (production hub or yard). `StockMovement` is an
append-only ledger (deltas + reason) rather than only a running total, so stock discrepancies
are auditable — the same pattern used on Roofsteel's inventory module.

## Fulfilment-type-driven stock behaviour
- `STOCK` items: standard reserve-on-cart, release-on-timeout inventory flow.
- `MADE_TO_ORDER` items: no stock reservation; adding to cart creates a production-queue
  placeholder instead.
- `CMI_PARTNER_NETWORK` items: no stock reservation; adding to cart flags the order for CMI
  routing on checkout (see `06-cmi-partner-routing.md`).
