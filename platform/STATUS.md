# STATUS — Aluminium Store Platform

**A Specialised Operating Division of Besbpo Group.**

Single source of truth for what exists, what works, and what is still missing. Update this file
in the same PR as any change to module completeness — a module that lands or regresses must not
leave this file stale. `docs/16-roadmap.md` remains the phase plan (the *what* and *why*);
this file is the tracker (the *how far along*).

Last verified: 2026-09-19 · Branch: `main` · Deploy target: Render (`render.yaml`)

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Wired | Real logic against the real database. Exercised by the smoke test or a unit test. |
| 🟡 Partial | Core flow works, but a named piece is a deliberate placeholder. See the note in the row. |
| 🔴 Not started | Scaffold only, or absent. |

"Verified by" names the actual check that proves it — `smoke` = `scripts/smoke.sh`,
`spec` = co-located Jest spec, `ci` = build/typecheck gate. An unverified ✅ is a claim, not a fact.

## Snapshot

| Metric | Value |
|---|---|
| Source files (`.ts`/`.tsx`/`.py`/`.prisma`) | 220 |
| Source lines | ~10,960 |
| Prisma models | 60 |
| API route handlers | 128 |
| Backend modules | 32 |
| Storefront routes | 39 |
| Docs | 35 |
| Migrations | 4 |
| Unit tests | 55 (37 backend Jest, 18 pricing pytest) |
| Smoke checks | 45 |

## How to verify this file

```bash
# Unit tests (no database needed)
cd platform/backend && npm test
cd platform/pricing-service && python3 -m pytest

# End-to-end smoke test (needs a running, seeded Postgres + backend)
cd platform && bash scripts/smoke.sh
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
- [x] Seed data: 7 categories, 31 sub-categories, 33 products, 9 delivery zones
- [x] Deployability pass for Render (`docs/35-deployment-render.md`)

### Phase 2 — Configurator & Pricing 🟡 In progress

- [x] FastAPI pricing microservice (glazing, finishes, markup, trade/volume tiers)
- [x] Configurator API + UI
- [x] Cart (add/update/remove, stock reservation)
- [ ] **Full 2,147-SKU catalogue** — blocked on the Master Product Catalogue workbook (see Gaps)
- [ ] Street-level delivery address capture on checkout
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

Verification is honest about coverage. Of the 32 backend modules, **13 are exercised by the smoke
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
| `orders` | Checkout transaction, order numbering, concurrent-submit protection, cancel | smoke, spec |
| `business-desk` | Company-scoped team/dashboard, company-role guard | smoke |
| `delivery` | Weight-banded, province-aware delivery quote + fragile surcharge | smoke |
| `newsletter` | Subscribe; unsubscribe requires a signed token | smoke |
| `trade-accounts` | Application/approval; auth required | smoke (guard only) |
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
| `payments` | Method dispatch, order ownership check, trade-terms eligibility gating | Gateway calls build a bare `redirectUrl` with no signature and no credential use. **No webhook handler, so no payment can be confirmed.** |
| `communications` | Call sites and interfaces are in place | All senders are `TODO(phase-2)`: WhatsApp, SMS (Clickatell/BulkSMS), transactional email (Postmark/SendGrid/SES). Nothing is sent today. |
| `ai-agent` | Endpoint, DTOs, grounding contract | Returns a placeholder; the Claude call and pgvector retrieval are `TODO(phase-2)`, explicitly not faked. |
| `catalog` (writes) | Validated DTOs, admin create/update, FK and conflict errors mapped | Master Product Catalogue workbook import/sync is not built. |

## Known gaps and blockers

1. **The catalogue is at 33 SKUs, not 2,147.** `docs/00-overview.md` and `docs/02-storefront-ux-ia.md`
   describe the full 2,147-SKU catalogue. The seeded set is 7 categories / 31 sub-categories / 33
   products. `docs/04-catalogue-cms.md` names the **Master Product Catalogue workbook** as the
   canonical source of SKU definitions, and that workbook was **not included** in
   `aluminium-store-platform.zip` (which contains only scaffold code and docs). Nothing is broken —
   the data has not been handed over. This blocks the launch-readiness of every category page.
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
| 2026-09-19 | Added this tracker, the smoke test, Jest/pytest suites and CI. Fixed the missing `FREE_STATE`/`NORTHERN_CAPE` migration and the duplicate `ALS-FIX-0001` SKU. |
| 2026-09-19 | Render deployability pass: runtime API proxy replacing the build-time rewrite, Dockerfiles for all three services, guard/checkout/newsletter hardening. |