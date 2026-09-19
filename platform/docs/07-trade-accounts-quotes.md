# Trade Accounts & Quote/RFQ

## Trade account lifecycle
1. Buyer applies via `/account/trade/apply` (company name, registration/VAT numbers)
2. Application queues for manual review (`TradeAccount.approved = false` until reviewed)
3. On approval, `DiscountTier` unlocks Trade (−12%) or Volume (−20%) pricing automatically
   across the whole catalogue and configurator

## RFQ / Quote flow
For work that doesn't fit a simple cart checkout — full curtain-wall elevations, multi-building
institutional glazing packages, anything CMI-routable — buyers use `/quote/new` instead of the
cart:
- Free-text project description + `QuoteItem` rows (approximate area, quantity, notes) rather
  than exact SKUs, since these are frequently pre-design-freeze enquiries
- Staff convert an accepted quote into either a standard `Order` or a CMI-routed one
- `Quote.validUntil` defaults to 30 days, matching typical SA construction-tender quote
  validity windows

## Why quotes are a separate model from orders
Roofsteel's real-world experience (the Durban Y12 rebar deal) showed that big-ticket B2B deals
rarely move straight through a self-service cart — they need a human-priced, negotiable step
first. `Quote` exists so that step has its own status lifecycle (`SUBMITTED` →
`UNDER_REVIEW` → `QUOTED` → `ACCEPTED`) rather than being bolted onto `Order`.
