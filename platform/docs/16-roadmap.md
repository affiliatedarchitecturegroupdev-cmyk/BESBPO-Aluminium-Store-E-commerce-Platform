# Roadmap — HITLAD Phases

Following the Group's proven Human-In-The-Loop Agentic Development model:

1. **Phase 1 — Foundation (Claude Code scaffold)**: schema, auth, catalog read APIs, basic
   storefront browsing. *This scaffold package is Phase 1's starting point.*
2. **Phase 2 — Configurator & Pricing**: FastAPI pricing microservice, configurator UI, live
   price computation, cart.
3. **Phase 3 — Orders, Payments & Trade Accounts**: checkout, PayFast/Lulapay/PayJustNow,
   trade account application/approval flow.
4. **Phase 4 — CMI Routing & Compliance**: partner routing engine, compliance-document
   attachment, quote/RFQ flow.
5. **Phase 5 — Delivery, Admin & Launch Hardening** (OpenHands agentic build-out, human PR
   review): delivery-zone/shipment tracking, admin CMS, load testing, security review.

## Launch-hardening pass (open)

A deployability and security pass has been completed on the Phase 1 scaffold so it builds and
runs on Render. See `docs/35-deployment-render.md`. Findings worth carrying into later phases:

- **Role guards.** `RolesGuard` and `CompanyRoleGuard` read role metadata from the handler only,
  so class-level `@Roles(...)` was ignored and the admin surface was reachable by any signed-in
  user. Both now read handler *and* class metadata, and deny by throwing rather than returning
  false.
- **Checkout double-submit.** The cart was read outside the checkout transaction, so concurrent
  submissions each produced a full order from the same basket. The cart is now consumed first
  inside the transaction and a lost race is rejected with 409.
- **Province validation.** `CreateOrderDto` accepted a free-form province string that reached
  Prisma's enum column and 500'd on every checkout with a province set. The nine-province list is
  now shared from `src/common/provinces.ts` rather than duplicated (two copies had drifted).
- **Newsletter unsubscribe.** `?email=` let anyone unsubscribe any address. It now requires a
  signed token scoped to an unsubscribe audience.
- **Health check.** The endpoint documented a non-200 on database failure but returned 200
  regardless; it now throws 503.

## Sequencing note
Unlike Roofsteel, the configurator (Phase 2) is pulled earlier in this roadmap rather than
treated as a differentiator bolted on later — it is core to how a buyer actually prices a
window or door on this platform.
