# Trade Accounts & Quote/RFQ

## Trade account lifecycle
1. Buyer applies via `/account/trade/apply` (company name, registration/VAT numbers)
2. Application queues for manual review (`TradeAccount.approved = false` until reviewed)
3. Staff approve via `POST /trade-accounts/:id/approve`, optionally setting `creditLimit` in the
   same call. Without a way to set the limit at approval, every new account would have to be given
   one by direct database edit, and an account with no limit can buy without bound.
4. On approval, `DiscountTier` unlocks Trade (−12%) or Volume (−20%) pricing automatically
   across the whole catalogue and configurator

## Credit limit enforcement
`creditLimit` is not advisory — it is checked when an order on terms is confirmed, and
`creditUsed` is incremented at that moment. Cancelling a confirmed order returns the credit.
See [docs/11-payments.md](11-payments.md#trade-credit-where-the-limit-is-actually-enforced) for
the atomic-update rationale and the concurrency evidence.

An account whose `creditLimit` is `null` has **no credit facility** — approving an account
unlocks its pricing tier, which is a separate decision from granting it terms. A null limit is
never read as unlimited: `consumeCredit` requires the column to be non-null, so an order on
terms is refused and the buyer is told to settle by card, EFT or a buy-now-pay-later option.
This matches what the business desk already reports for the same value
(`business-desk.service.ts`), and it is distinct from an explicit limit of R0 — which grants a
facility with no headroom.

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
