# Back-Office Extras — Returns / RMA

## What's built
`ReturnRequest` — one per `OrderItem` (enforced via the `@unique` constraint on
`orderItemId`), with a status lifecycle `REQUESTED → APPROVED/REJECTED → ITEM_RECEIVED →
REFUNDED`. `ReturnsService.requestReturn()` is the server-side gate on ECTA's non-returnable
exclusion — see `docs/23-legal-tax-compliance.md`.

## What's flagged, not built, in this pass
- **Low-stock alerts + auto-PO triggers**: `StockLevel.reorderAt` already exists as a
  threshold field; the scheduled job that checks it and raises a purchase-order trigger is
  Phase 2 — the data model is ready, the automation isn't.
- **Bulk CSV/Excel import/export**: `docs/04-catalogue-cms.md` already describes syncing from
  the Master Product Catalogue workbook — the actual import job (parse, validate, upsert) is
  not yet implemented as code in this scaffold.
- **Split-shipment / backorder handling**: no schema changes made — `Order`/`OrderItem` would
  need a shipment-grouping concept if a single order legitimately ships in multiple parcels.
  Flagged for a dedicated design pass before building, not assumed.
- **Batch thermal waybill / packing-slip generation**: depends on the courier API integration
  (`docs/24-logistics-integrations.md`) being live first.
