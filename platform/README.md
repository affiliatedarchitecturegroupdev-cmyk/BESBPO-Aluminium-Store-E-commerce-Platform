# Aluminium Store Platform

**A Specialised Operating Division of Besbpo Group.**
E-commerce and configuration platform scaffold — Phase 1 (Foundation) of the HITLAD roadmap.
See `docs/16-roadmap.md`.

## What's in this package

```
platform/
├── backend/                 NestJS API (14 modules)
│   ├── prisma/schema.prisma 30 models, 14 enums — full data model
│   └── src/modules/         auth (6 sign-in options), catalog, configurator, cart,
│                             orders, trade-accounts, quotes, cmi-routing,
│                             compliance-docs, delivery, payments, admin, cms,
│                             business-desk
├── pricing-service/         FastAPI microservice — same formulas as the
│                             Pricing Framework workbook (assumptions.json
│                             is copied straight from that workbook's data)
├── frontend/                Next.js 14 App Router — 24 routes scaffolded,
│                             plus two fully-wired real components:
│                             Configurator.tsx and CategoryGrid.tsx
├── docs/                    21 guideline documents — one concern each
├── docker-compose.yml       Local dev orchestration (postgres, redis, all 3 services)
└── .env.example files       backend/ and frontend/
```

## What's new in this pass (beyond the original scaffold)
- **Six sign-in options**: Email/password plus Google, Facebook, X, Apple, and Microsoft
  OAuth — all resolving to one `User` record via account-linking (see
  `docs/18-authentication-sso.md`). Real Passport strategy files for all five providers.
- **CMS module**: hero slides, promo banners, category features, SEO metadata, and a
  media library — separate from the catalogue CMS (`docs/19-cms.md`).
- **Business Desk**: a B2B self-service portal built around a new `Company` model (one
  company, many team members, `OWNER`/`BUYER`/`VIEWER` roles) — dashboard, orders, quotes,
  statements, credit position, team management (`docs/20-business-desk.md`).
- Fixed a real bug caught during this pass: several auto-generated services were calling
  the wrong Prisma model delegate (e.g. `prisma.catalog` instead of `prisma.product`) —
  corrected across all affected modules.

## Read this first
1. The companion **Technical & Product Specification (PDF)** — executive summary, feature
   adoption matrix, wireframes/mockups, architecture diagrams, and the case for each
   architectural decision.
2. `docs/00-overview.md` — how this platform differs from the generic Group blueprint and
   from Roofsteel's platform.
3. `docs/17-open-questions.md` — decisions needed from Fortune before Phase 1 build-out
   begins in earnest.

## Verified consistency
`pricing-service/main.py` was tested against the actual Pricing Framework workbook's verified
output (1209×909mm sliding window → R3,944.27 retail; 1209×1209mm casement → R4,713.73 retail)
and matches to the cent — the API is not a reimplementation guess, it runs the same formula.

## Running locally (once dependencies are installed with network access)
```bash
# Everything at once
docker compose up

# Or individually:
cd backend && npm install && npx prisma generate && npm run start:dev
cd pricing-service && pip install -r requirements.txt && uvicorn main:app --reload
cd frontend && npm install && npm run dev
```

## Scope note
This is a **Phase 1 scaffold** — schema, module structure, DTOs, and several fully-wired
real components/flows (not just stubs): the Configurator, the six-provider auth flow, the
CMI routing engine, and the Business Desk application flow all contain real logic, not
placeholders. Business logic elsewhere (payment gateway wiring, BullMQ job definitions) is
intentionally minimal and marked with comments where Phase 2+ work is needed. See
`docs/16-roadmap.md` for the phase breakdown.

