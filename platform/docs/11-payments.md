# Payment Strategy

| Method | Use case | Notes |
|---|---|---|
| PayFast | Retail card/EFT checkout | Group-standard SA payment gateway |
| Lulapay (B2B BNPL) | Trade/Volume tier checkout | Same partner already onboarded for Roofsteel; solves the "no registered credit intermediary" gap for offering buy-now-pay-later on B2B account terms |
| PayJustNow | Retail-tier only | Consumer BNPL, not exposed to Trade/Volume accounts |
| Trade Account Terms | Approved `TradeAccount` holders | Invoice-on-terms, reconciled against the existing Besbpo/Aluminium Store invoicing system rather than a new one |
| EFT | Manual fallback | Large CMI-routed project payments where milestone billing applies |

## Why Yoco is deferred
Consistent with the Roofsteel precedent — Yoco is a strong in-person/card-present product, less
relevant to an online storefront's checkout flow, so it stays deferred rather than adding a
fourth online gateway to reconcile against.

## CMI-routed and quote-based orders
These frequently involve milestone billing (deposit → progress → completion) rather than a
single checkout charge — handled via `EFT` and manual invoicing against the `Quote` record
rather than forcing a milestone-billing model into the online checkout flow prematurely.
