# Analytics — Scope Note

## What this table is, and isn't
`AnalyticsEvent` captures **server-side business events** — a CMI routing decision, a coupon
application, a quote request, a price computation — logged alongside the orders/quotes data
they relate to, queryable directly in Postgres without needing to correlate against an
external tool.

It is explicitly **not** a replacement for real behaviour analytics. Session recording, scroll
depth, funnel drop-off, page views, and marketing-attribution — all of that is PostHog or GA4
territory, per the original scope discussion. Building a bespoke event-pipeline to replace a
mature product like PostHog was assessed and rejected as not worth the engineering time before
product-market fit is proven.

## Recommended split
- **Client-side behaviour** → PostHog (self-hosted, matches the Group's af-south-1
  data-sovereignty preference) or GA4
- **Server-side business events worth joining against orders/quotes in SQL** → this table

## Integration point
`AnalyticsService.logServerEvent()` is a convenience method other modules call directly (the
`cmi-routing` module logging a `CMI_ROUTED` event is the intended first real caller) —
avoiding every module needing its own Prisma import just to write one audit-style row.
