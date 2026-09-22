# Merchandising Sections

## Purpose

The ten merchandising sections requested on top of the 18-section homepage in
`Aluminium-Store-Technical-Product-Specification-v1.0.pdf` §7.1. These are merchandising
surfaces, not new catalogue entities: each one is a *view* over the catalogue, order, review
and analytics data that already exists, and none of them owns pricing.

Two rules shaped the whole set, and each section states which one it is following:

1. **A section says what it is based on.** "Best Sellers" is cumulative units shipped, "Top
   Rated" needs three reviews, "Recommended" is sub-category affinity, not a model. Where the
   data cannot support the claim, the section says so instead of filling the space.
2. **A section that has nothing honest to show does not show.** Clearance disappears when stock
   is full price; Recently Viewed and Recommended disappear for a first-time visitor. An empty
   shelf with invented content is worse than no shelf.

## The ten sections

| # | Section | Placement | Basis | Empty behaviour |
|---|---------|-----------|-------|-----------------|
| 1 | Best Sellers | Home | Cumulative units sold, from `OrderItem` | Empty state naming the basis |
| 2 | Top Rated | Home | Average review rating, 3-review minimum | Empty state |
| 3 | Shop by Finish | Home | Live product count per `Finish` | Swatch set only |
| 4 | Recently Viewed | Home + PDP | Caller's own view history | Renders nothing |
| 5 | Recommended For You | Home + PDP | Sub-category of the last product viewed | Renders nothing |
| 6 | Daily Deals | Home | A capped quantity at a reduced price | Empty state |
| 7 | Featured Products | Home | Curator's note, rendered verbatim | Empty state |
| 8 | Seasonal / Thematic Collections | Home | Curated grouping, own accent colour | Empty state |
| 9 | Budget Shop | Home | Approximate price bands, tabbed | Empty state |
| 10 | Product Pairings | PDP | Curated directional pairing | Renders nothing |

## Backend modules

| Module | Route prefix | Notes |
|--------|--------------|-------|
| `catalog` (merchandising) | `/catalog/best-sellers`, `/top-rated`, `/by-finish`, `/budget-shop` | Read-only aggregations, no new tables |
| `featured-products` | `/featured-products` | `FeaturedPick` |
| `product-pairings` | `/product-pairings` | `ProductPairing` |
| `daily-deals` | `/daily-deals` | `DailyDeal`, with a claim cap |
| `collections` | `/collections` | `Collection` + `CollectionItem` |
| `analytics` | `/analytics/recently-viewed`, `/recommended`, `/product-view` | Reads/writes `AnalyticsEvent` |

## Daily Deals — the claim cap

`stockLimit` is enforced on the row, not in application code. `claimed` is incremented by a
conditional `UPDATE ... WHERE claimed + n <= stockLimit` so two concurrent checkouts cannot
both take the last unit:

```sql
UPDATE "DailyDeal"
SET "claimed" = "claimed" + $1
WHERE "id" = $2 AND "claimed" + $1 <= "stockLimit"
```

A zero-row result means sold out. `claimed` is **not** curator-editable through the service
layer: it is a running counter of what buyers have taken, and letting an admin field update it
would let a merchandiser silently oversell or rewrite consumption history. Curators set
`stockLimit`; the counter moves itself.

## Budget Shop — the bands are approximate

Bands are computed off a base cost multiple, so a product sitting exactly on a boundary may
appear in the adjacent tab. The API flags this (`approximate: true` and `approximationNote`)
and the section renders the qualifier. Presenting a band as exact when it is derived would make
the count on the tab disagree with the grid behind it, which is the kind of small lie a buyer
notices immediately.

## Recently Viewed / Recommended — identity and scope

Both read endpoints are **public** and key off either the signed-in buyer or an opaque
per-browser session id. They carry `OptionalJwtAuthGuard`:

- A guest has no token and must still be served — a plain `JwtAuthGuard` would 401 them.
- A signed-in buyer's history should follow the account across devices, which needs
  `req.user.id` populated — no guard at all would leave it undefined and the account path
  would silently never run.
- An invalid or expired token is treated as "not signed in", not an error, because the
  endpoint is usable without a token in the first place.

Reads are scoped to the caller's own key, so one session cannot read another's history without
knowing its id. With neither key present the API returns `[]` — it does not fall back to
another shopper's data.

## Clearance — a reachable destination

The homepage Clearance carousel is hidden when nothing is marked down (`clearancePrice` null,
or past `clearanceEndsAt`). The hero's "Shop Clearance" CTA therefore points at
`/catalogue?clearance=1`, which queries `GET /catalog/clearance` directly, rather than at a
homepage anchor that only exists while the carousel does. The CTA and the section are
independent, so the link cannot dangle.

Clearance pricing is deliberately independent of the discount tier: a clearance price is the
price, and the cart charges `clearancePrice` when it is active. Hero copy quoting a discount
must match the deepest markdown actually in the catalogue — the current slide says "up to 35%",
which is the seeded maximum.
