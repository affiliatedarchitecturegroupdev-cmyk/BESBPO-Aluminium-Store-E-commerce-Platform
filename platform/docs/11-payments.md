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

## Trade credit: where the limit is actually enforced

Trade Account Terms is the one method that extends *credit* rather than collecting money, so it
is the only one where an order can outrun the buyer's ability to pay. `TradeAccount.creditLimit`
and `creditUsed` express that limit.

`creditUsed` is committed at **payment confirmation**, not at checkout. An order sitting
`PENDING` has reserved nothing; the commitment happens when the order becomes
`PAYMENT_CONFIRMED`, and is returned if that order is later cancelled. Confirm is therefore the
single gate, and `OrdersService.confirmPayment` is its only implementation — both the admin route
(`POST /orders/:id/confirm-payment`) and the trade-terms settlement path
(`POST /payments/initiate` with `method: TRADE_ACCOUNT_TERMS`) delegate to it. There is
deliberately no second writer of `PAYMENT_CONFIRMED`, because a second writer is how the limit
came to be unenforced in the first place.

The check and the increment are one statement, not a read-then-write:

```sql
UPDATE "TradeAccount" SET "creditUsed" = "creditUsed" + $amount
WHERE "companyId" = $companyId AND "approved" = true
  AND ("creditLimit" IS NULL OR "creditUsed" + $amount <= "creditLimit")
```

If this matches no row, the order is refused with a 400 and stays `PENDING`. Postgres applies the
`WHERE` and the increment under a single row lock, so two concurrent confirmations cannot both
consume the last of the headroom — verified by running three simultaneous R60 000 commitments
against a R150 000 limit: exactly two succeeded. A read-then-compare in JavaScript would let all
three through. The same reasoning is documented on `CounterService`.

The reservation and the status write are wrapped in one transaction, and the status transition is
itself a *conditional* update (`WHERE status = PENDING`). That second part matters for a different
race — the same order confirmed twice. Two callers can read `PENDING` before either writes (a
gateway webhook retried while the first call is still in flight, or an admin double-submitting).
A plain update would let both through and reserve the buyer's credit twice for a single order; the
conditional update matches one row and aborts the loser, rolling its reservation back with it.
Verified against the database: five simultaneous confirmations of one order produced exactly one
success, one invoice, and one credit commitment.

Two consequences worth stating explicitly:

- `creditLimit` of `null` means **no limit set**, not zero. Treating it as zero would silently
  block every account approved without a figure, so the predicate short-circuits on `NULL`.
- Settling an order by a method other than the one it was placed with is rejected with a 400. An
  order created as `PAYFAST` could otherwise be settled through the trade-terms path, and because
  `confirmPayment` decides whether to consume credit from the order's *own* `paymentMethod`, that
  mismatch would mark the order paid while skipping the credit check entirely.

`POST /trade-accounts/:id/approve` accepts an optional `creditLimit`. Before it did, there was no
way to set a limit over HTTP at all, which is part of why enforcement stayed inert.

## CMI-routed and quote-based orders
These frequently involve milestone billing (deposit → progress → completion) rather than a
single checkout charge — handled via `EFT` and manual invoicing against the `Quote` record
rather than forcing a milestone-billing model into the online checkout flow prematurely.
