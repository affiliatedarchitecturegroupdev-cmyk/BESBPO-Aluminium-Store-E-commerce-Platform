# STATUS — Aluminium Store Platform

**A Specialised Operating Division of Besbpo Group.**

Single source of truth for what exists, what works, and what is still missing. Update this file
in the same PR as any change to module completeness — a module that lands or regresses must not
leave this file stale. `docs/16-roadmap.md` remains the phase plan (the *what* and *why*);
this file is the tracker (the *how far along*).

Last verified: 2026-09-21 · Branch: `main` · Deploy target: Render (`render.yaml`)

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Wired | Real logic against the real database. Exercised by the smoke test or a unit test. |
| 🟡 Partial | Core flow works, but a named piece is a deliberate placeholder. See the note in the row. |
| 🔴 Not started | Scaffold only, or absent. |

"Verified by" names the actual check that proves it — `smoke` = `scripts/smoke.sh`,
`spec` = co-located Jest spec, `e2e` = Playwright suite under `e2e/`, `ci` = build/typecheck gate.
An unverified ✅ is a claim, not a fact.

## Snapshot

| Metric | Value |
|---|---|
| Source files (`.ts`/`.tsx`/`.py`/`.prisma`) | 235 |
| Source lines | ~12,540 |
| Prisma models | 60 |
| API route handlers | 132 |
| Backend modules | 35 |
| Storefront routes | 39 |
| Docs | 36 |
| Migrations | 5 |
| Unit tests | 87 (69 backend Jest, 18 pricing pytest) |
| Smoke checks | 83 |
| Browser e2e tests | 6 (Playwright, `platform/e2e`) |
| Catalogue | 2,147 SKUs / 7 categories / 31 sub-categories |

## How to verify this file

```bash
# Unit tests (no database needed)
cd platform/backend && npm test
cd platform/pricing-service && python3 -m pytest

# End-to-end smoke test (needs a running, seeded Postgres + backend)
cd platform && bash scripts/smoke.sh

# Browser e2e (needs seeded DB + running backend and frontend; starts its own if needed)
cd platform/e2e && npx playwright test
```

CI (`.github/workflows/ci.yml`) runs the builds and unit tests on every push and PR. The smoke
test runs too, against an ephemeral Postgres service container.

## Phase tracker

Phase definitions live in `docs/16-roadmap.md`.

### Phase 1 — Foundation ✅ Complete

- [x] Prisma schema (60 models) and migrations
- [x] JWT auth, registration, login, guards
- [x] Catalogue taxonomy + read APIs
- [x] Storefront shell, navigation, browse pages
- [x] Seed data: 9 delivery zones, 7 categories, 31 sub-categories
- [x] Deployability pass for Render (`docs/35-deployment-render.md`)

### Phase 2 — Configurator & Pricing 🟡 In progress

- [x] FastAPI pricing microservice (glazing, finishes, markup, trade/volume tiers)
- [x] Configurator API + UI
- [x] Cart (add/update/remove, stock reservation)
- [x] **Full 2,147-SKU catalogue** — imported from the workbook by `scripts/import-catalogue.py`
- [x] Add-to-cart from the product page, priced server-side from the configuration
- [x] Street-level delivery address capture on checkout (`addresses` module + checkout form)
- [ ] Gateway hosted-page redirect at checkout

### Phase 3 — Orders, Payments & Trade Accounts 🟡 In progress

- [x] Order creation, atomic order-number counter, checkout transaction
- [x] Trade account application and approval flow
- [x] Quotes, returns, wishlists
- [ ] Live payment gateway integration (PayFast / Lulapay / PayJustNow)
- [ ] Payment webhooks and reconciliation
- [ ] Push to the existing Besbpo invoicing system (open question 5)

### Phase 4 — CMI Routing & Compliance 🟡 In progress

- [x] Partner routing suggestion engine (`AI proposes, humans approve` — never auto-assigns)
- [x] Compliance document storage and admin surface
- [x] Legal/tax module (ECTA, POPIA, PAIA, CPA, SARS references)
- [ ] Compliance-document **attachment** to orders at checkout
- [ ] Quote/RFQ flow for sizes outside the AAAMSA-tested range (open question 3)

### Phase 5 — Delivery, Admin & Launch Hardening 🔴 Not started

- [ ] Delivery-zone / shipment tracking against a live courier
- [ ] Admin CMS workbook import
- [ ] Load testing
- [ ] Security review

## Module register

Verification is honest about coverage. Of the 33 backend modules, **14 are exercised by the smoke
test**, the guards are unit-tested, and the rest compile and are routed but have no test — which
means they are "wired" only in the sense that they build and their route is registered. Read the
"Verified by" column literally.

### Exercised by the smoke test

| Module | Responsibility | Verified by |
|---|---|---|
| `health` | Liveness + database check; reports the DB as down rather than pretending | smoke |
| `auth` | Register, login, JWT issuance | smoke, spec |
| `admin` | Admin surface; role guard (class-level `@Roles`) | smoke, spec |
| `catalog` | Reads, filters, SKU lookup, admin writes incl. duplicate/invalid handling | smoke |
| `configurator` | Sizing intake, delegates to the pricing service | smoke |
| `cart` | Cart lifecycle, server-side repricing | smoke |
| `addresses` | Per-user delivery address book; every read/write scoped by owner | smoke, spec |
| `orders` | Checkout transaction, order numbering, concurrent-submit protection, cancel, delivery-address ownership | smoke, spec |
| `business-desk` | Company-scoped team/dashboard, company-role guard | smoke |
| `delivery` | Weight-banded, province-aware delivery quote + fragile surcharge | smoke |
| `newsletter` | Subscribe; unsubscribe requires a signed token | smoke |
| `trade-accounts` | Application/approval (with optional `creditLimit`); auth required | smoke, spec |
| `compliance-docs` | Document listing | smoke (list only) |
| `cmi-routing` | Partner candidate list | smoke (list only) |

### Compiles and routes, but has no test

`advertisements`, `ai-agent`, `analytics`, `blog`, `cms`, `communications`, `faq`, `legal-tax`,
`logistics`, `loyalty`, `payments`, `product-questions`, `projects`, `promotions`, `quotes`,
`returns`, `reviews`, `support`, `wishlists`.

These are scaffold-complete — DTOs, controllers, and service methods exist and the route is
registered — but nothing proves they behave correctly. Treat them as unverified.

### Partial — a placeholder behind a working shell

| Module | What works | What is missing |
|---|---|---|
| `payments` | Method dispatch, order ownership check, method-mismatch rejection, trade-terms eligibility gating; trade-terms settlement delegates to `OrdersService.confirmPayment`, so it cannot skip the credit check | Gateway calls build a bare `redirectUrl` with no signature and no credential use. **No webhook handler, so no payment can be confirmed.** |
| `communications` | Call sites and interfaces are in place | All senders are `TODO(phase-2)`: WhatsApp, SMS (Clickatell/BulkSMS), transactional email (Postmark/SendGrid/SES). Nothing is sent today. |
| `ai-agent` | Endpoint, DTOs, grounding contract | Returns a placeholder; the Claude call and pgvector retrieval are `TODO(phase-2)`, explicitly not faked. |
| `catalog` (writes) | Validated DTOs, admin create/update, FK and conflict errors mapped; full workbook import via `scripts/import-catalogue.py` | In-app *re-sync* of a changed workbook is still a manual, out-of-band script run. |

## Known gaps and blockers

1. **Catalogue imported; volume pricing below cost on thin-margin commodities.** The
   2,147-SKU Master Product Catalogue workbook has been imported (`scripts/import-catalogue.py` →
   `data/catalogue.json` → `seed.ts`), so the catalogue gap is closed. The import surfaced a
   **pricing-framework defect that is now with the client**: the workbook applies a flat
   `VOLUME_DISCOUNT` of 20% off retail, but the extrusion and glazing markup bands are only 18%
   and 25%. The volume tier therefore lands at or below the cost build-up on **165 rows** — 144
   extrusion rows (worst case 5.6% *below* cost) and 21 glazing rows (exactly at cost). The
   pricing service reproduces the same arithmetic (`main.py:79-88`), so this is the workbook's
   formula, not an import error. The importer does not invent corrective prices; the exposure is
   pinned by a test (`seed.spec.ts`, "confines every at-or-below-cost volume price…") so it cannot
   silently spread to finished goods. **No VOLUME-tier account should be approved until the client
   confirms a floor or a per-band discount.** Retail and trade clear cost on all 2,147 rows.
2. **No live payment can be confirmed.** No gateway is integrated and no webhook exists. Checkout
   correctly creates an order, but an order can never transition to paid. This is the largest
   functional gap between the scaffold and a trading store.
3. **Six decisions are outstanding** from the client — see `docs/17-open-questions.md`. One is
   blocking a live code path: the CMI hub-capacity threshold (`DEFAULT_HUB_CAPACITY_M2 = 150`,
   `cmi-routing.service.ts`) is an unconfirmed default.
4. **Render region vs. POPIA.** `render.yaml` deploys to `frankfurt`; Render has no `af-south-1`.
   Either keep the database on Supabase `af-south-1` or accept EU hosting and record the
   data-residency position. See `docs/35-deployment-render.md`.
5. **Region confirmation is a raised bar for POPIA** — personal information leaving the Republic
   needs a documented basis, not just a deployment default.

## Change log

| Date | Change |
|---|---|
| 2026-09-21 | **Deploy fix: storefront bound to the instance hostname, not every interface.** Next.js's generated `server.js` listens on `process.env.HOSTNAME \|\| '0.0.0.0'`. Render sets `HOSTNAME` to the instance hostname, which resolves to its internal IP, so `scripts/start-standalone.sh` brought the storefront up on that one address and the platform health check could not reach the port. The script now exports `HOSTNAME=0.0.0.0`, matching what the Dockerfile already pinned with `ENV HOSTNAME=0.0.0.0`. Confirmed locally: before the change `curl http://localhost:$PORT` was refused while `http://$HOSTNAME:$PORT` returned 200; after it, both return 200 and static assets serve. `docs/35-deployment-render.md` now also states that the stack must be created with **New → Blueprint** — deploying a hand-made Web Service skips `rootDir: platform/frontend` and fails at the repository root with `Could not read package.json`, which is what a Render build log showing a *default* Node version indicates. |
| 2026-09-20 | **Trade credit is now enforced and consumed.** `creditUsed` was displayed on the business desk but never incremented, and no code compared an order against `creditLimit` — an approved trade account could order without limit. Credit is now committed in `OrdersService.confirmPayment` (the single writer of `PAYMENT_CONFIRMED`) via one guarded `UPDATE ... WHERE creditUsed + n <= creditLimit`, so the check and the increment cannot be split by a concurrent order; refused orders stay `PENDING` and consume nothing. Cancelling a confirmed trade-terms order returns the credit. The reservation and the status transition share one transaction, and the transition is a conditional update so a retried webhook or double-submitted form cannot confirm the same order twice or reserve credit twice for it. `POST /payments/initiate` for trade terms now delegates to `confirmPayment` instead of writing the status itself, and settling an order by a method other than the one it was placed with is rejected (a `PAYFAST` order settled on trade terms would otherwise have skipped the credit check). `POST /trade-accounts/:id/approve` accepts an optional `creditLimit`; previously no HTTP route could set one at all. Verified against Postgres: exactly 2 of 3 concurrent R60 000 commitments succeed against a R150 000 limit, and 5 concurrent confirmations of one order yield one success, one invoice and one commitment. |
| 2026-09-19 | Checkout/address/delivery correctness slice. Added the `addresses` module (per-user address book, every read/write scoped by owner, exactly one default per account). Fixed the checkout province list, which had drifted to a hand-copied seven and silently dropped Free State and Northern Cape — a shopper there was charged Gauteng delivery; the list now mirrors the backend enum. Checkout now captures a street address and sends `deliveryAddressId`. Closed two order defects: `deliveryAddressId` was written onto the order without an ownership check (any cuid could attach another account's address), and an omitted province fell through to a zone lookup that matched nothing, pricing delivery at **R0** — i.e. free delivery to anyone who left the field out. Both now fail with 400. |
| 2026-09-19 | Imported the 2,147-SKU Master Product Catalogue workbook (`scripts/import-catalogue.py`); added retail/trade/volume price columns and tier-aware cart pricing; added add-to-cart to the product page; added a Playwright e2e suite; retargeted the seed integrity tests at `data/catalogue.json`. Found and flagged the workbook's below-cost volume pricing on 165 thin-margin rows. |
| 2026-09-19 | Added this tracker, the smoke test, Jest/pytest suites and CI. Fixed the missing `FREE_STATE`/`NORTHERN_CAPE` migration and the duplicate `ALS-FIX-0001` SKU. |
| 2026-09-19 | Render deployability pass: runtime API proxy replacing the build-time rewrite, Dockerfiles for all three services, guard/checkout/newsletter hardening. |