# Business Desk

A self-service portal for Trade and Volume accounts — the B2B equivalent of the retail
`/account` area, built around a `Company` rather than a single `User`.

## Why Company, not just TradeAccount-on-User
A real trade customer is rarely one person. A construction company's owner applies for the
account, but their buyers place orders and their bookkeeper needs statements — one shared
account, several people, different permission levels. `Company` holds the `TradeAccount`
and has many `User` records, each with a `CompanyRole`:

| Role | Can do |
|---|---|
| `OWNER` | Everything below, plus manage the team (invite/remove) and view credit position |
| `BUYER` | Place orders, submit quotes/RFQs, view own order history |
| `VIEWER` | Read-only — order history and statements, no ordering |

## What the Business Desk shows
- **Dashboard** — open orders, open quotes, discount tier, credit limit/used, team size at
  a glance
- **Orders** — every order placed by anyone on the team, not just the logged-in user
- **Quotes** — same, for the RFQ/quote pipeline
- **Statements** — downloadable period statements (`Statement.fileUrl`), generated
  against the existing Besbpo/Aluminium Store invoicing system per `08-checkout-fulfilment.md`
- **Credit** — limit, used, available — read-only; limit changes happen via admin review,
  not self-service
- **Team** (`OWNER` only) — invite/remove team members, see who has which role

## Applying for a Business Desk account
`POST /trade-accounts/apply` creates the `Company` and an unapproved `TradeAccount` in one
step, sets the applying user as `OWNER`. Approval remains a manual admin step
(`POST /trade-accounts/:id/approve`) — see `07-trade-accounts-quotes.md` for why this stays
human-reviewed rather than instant.

## Relationship to the six sign-in options
Team members invited via the Business Desk are created as placeholder records tied to the
company; whichever of the six sign-in options (`18-authentication-sso.md`) they use on
first login links to that placeholder — nobody needs a separate "business" password
scheme.
