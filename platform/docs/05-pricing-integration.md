# Pricing Engine Integration

## Single source of truth
The Pricing Framework workbook's logic (Cost Assumptions → Category Markup Bands → Customer
Tiers → Priced Catalogue) is ported into the `PricingAssumption`, `MarkupBand`, and per-product
`baseCost` fields in the database — not re-derived independently. A scheduled job re-imports
the workbook's assumption sheets on change, so a pricing-team edit in Excel is the actual
change-control mechanism, consistent with how the Group already runs pricing updates.

## Live computation path
1. Configurator or catalogue page requests a price for `(productId, configSnapshot)`
2. FastAPI pricing microservice loads the product's `pricingBasis` enum and looks up the
   relevant `PricingAssumption` and `MarkupBand` rows
3. Formula matches the one verified in the workbook (area-rate, length-run, footprint-frame,
   rate-card, or extrusion-length branch) — see the Pricing Framework's Read Me sheet for the
   exact formulas per basis
4. Returns Retail, Trade (−12%), and Volume (−20%) prices; frontend shows the tier matching the
   logged-in user's `DiscountTier`

## Why a microservice instead of inline Node logic
Keeping this in Python (FastAPI) lets the same formula logic be validated against the actual
`.xlsx` workbook using `openpyxl` in CI — a regression test opens the real pricing workbook,
computes a sample of SKUs both ways, and fails the build if the API and the workbook disagree.
