# API Module Breakdown (NestJS)

One module = one bounded business concern. Modules live in `platform/backend/src/modules/`.

## Core commerce

| Module | Responsibility |
|---|---|
| `auth` | User auth, JWT issuance, role guard, SSO/OAuth callback |
| `catalog` | Category/SubCategory/Product read APIs, search/filter, admin writes |
| `configurator` | Proxies to the FastAPI pricing microservice, validates size/finish/glazing combinations |
| `cart` | Cart and CartItem CRUD |
| `addresses` | Per-user delivery address book; ownership-scoped reads/writes (see `36-delivery-addresses.md`) |
| `orders` | Order lifecycle, status transitions, checkout transaction |
| `quotes` | RFQ lifecycle |
| `payments` | PayFast/Lulapay/PayJustNow integration adapters |
| `delivery` | Delivery-zone lookup, fee calculation, shipment tracking |
| `logistics` | Courier handoff and tracking |
| `returns` | Return/refund requests against a delivered order |

## Trade and B2B

| Module | Responsibility |
|---|---|
| `trade-accounts` | Trade account application/approval, credit limits (`approve` accepts an optional `creditLimit`; `consumeCredit`/`releaseCredit` back `OrdersService` credit enforcement) |
| `business-desk` | Trade buyer dashboard aggregation, team/company-role administration |
| `cmi-routing` | Partner matching, routing job trigger, public partner directory |

## Catalogue depth and merchandising

| Module | Responsibility |
|---|---|
| `reviews` | Product reviews and moderation |
| `product-questions` | Buyer questions and supplier answers |
| `wishlists` | Saved products per user |
| `promotions` | Discount codes and campaign pricing |
| `loyalty` | Points accrual and redemption |

## Content and audience

| Module | Responsibility |
|---|---|
| `cms` | Editable storefront content blocks |
| `blog` | Article publishing |
| `faq` | Frequently asked questions |
| `projects` | Completed-project showcase |
| `advertisements` | Ad placement slots |
| `newsletter` | Subscriber list, signup, signed-token unsubscribe |
| `communications` | Transactional email/SMS dispatch |
| `support` | Support tickets |
| `ai-agent` | AI support agent conversation endpoints |

## Compliance, legal and analytics

| Module | Responsibility |
|---|---|
| `compliance-docs` | Compliance document attachment and retrieval |
| `legal-tax` | CPA/ECTA/POPIA/PAIA notices, VAT and SARS tax fields |
| `analytics` | Storefront and funnel metrics |
| `admin` | Admin-only aggregation endpoints |
| `health` | Liveness and database-reachability probe (Render health check) |

## Conventions

Each module follows the standard NestJS module/controller/service/DTO shape. A module's service
must not reach into another module's Prisma models for business logic — it calls the owning
module's service (see `AGENTS.md`).

Cross-cutting infrastructure lives in `src/common/`:

| File | Purpose |
|---|---|
| `provinces.ts` | The nine South African provinces, shared by every DTO that validates one |
| `prisma-exception.filter.ts` | Maps Prisma error codes to correct HTTP statuses (P2002 → 409, P2025 → 404) |

## Documentation expectation

Per `AGENTS.md`, a module that ships business logic gets a `docs/NN-module-name.md` guideline
doc. The docs below cover the domain areas; thin scaffold modules without behavioural rules yet
(CRUD-only stubs) are tracked in `docs/16-roadmap.md` rather than each getting a stub doc.
