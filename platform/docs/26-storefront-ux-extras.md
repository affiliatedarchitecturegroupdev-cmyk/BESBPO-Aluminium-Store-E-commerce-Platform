# Storefront UX Extras

Covers the blueprint-review gap items not already in `02-storefront-ux-ia.md`.

## Wishlists with price-drop alerts
`Wishlist`/`WishlistItem` record `priceAtAdd`; a scheduled job compares it against the
product's current computed price (via the pricing microservice) and notifies through
`CommunicationsService` when `notifyOnPriceDrop` is true and the price has genuinely dropped —
`WishlistsService.findPriceDropCandidates()` is the query that job runs.

## Product Q&A
`ProductQuestion` — public-facing questions only surface once answered
(`ProductQuestionsService.findForProduct()` filters on `answer: not null`), so an unanswered
question doesn't sit visibly unaddressed on a live product page.

## Review photo uploads
`Review.photoUrls` — binary upload goes to Supabase Storage from the frontend, same pattern as
the CMS media library; this field just stores the resulting URLs.

## Still frontend-component-level work (no new schema needed)
PLP faceted filters + grid/list toggle, PDP gallery/zoom, sticky Add-to-Cart bar, breadcrumbs,
mini-cart drawer, one-click reorder, MFA setup — these are UI work against existing data, not
new backend modules. Tracked as frontend components, not a schema gap.
