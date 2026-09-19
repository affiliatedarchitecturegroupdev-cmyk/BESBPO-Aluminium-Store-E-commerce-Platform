# Catalogue, CMS & Inventory Design

## Source of truth
The **Master Product Catalogue** workbook remains the canonical source for SKU definitions.
The CMS does not let admins invent new SKUs freely; it imports/syncs from an exported version
of the catalogue workbook (CSV/XLSX upload) and only allows editing of merchandising fields
(images, descriptions, sort order, active/inactive) plus stock levels.

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
