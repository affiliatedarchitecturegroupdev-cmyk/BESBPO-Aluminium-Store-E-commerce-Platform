# Admin / CMS

## Roles
`UserRole.ADMIN` unlocks the admin area. No separate admin-only auth system — same `User`
table, role-gated, matching the simpler access model already proven sufficient on Roofsteel.

## Admin capabilities
- Catalogue sync from workbook export (see `04-catalogue-cms.md`) and per-SKU merchandising edits
- Trade account approval queue
- Quote review and CMI-partner routing confirmation (human-in-the-loop step, see
  `06-cmi-partner-routing.md`)
- Compliance document upload/attachment
- Order and shipment status management
- Pricing-assumption view (read-only mirror of the workbook — edits happen in the workbook,
  not here, to keep one source of truth)

## Explicitly out of scope for v1
Multi-vendor seller management, commission/payout tooling, and marketplace dispute resolution —
all present in the generic Group blueprint, all dropped here since Aluminium Store is a
single-vendor platform (see `00-overview.md`).
