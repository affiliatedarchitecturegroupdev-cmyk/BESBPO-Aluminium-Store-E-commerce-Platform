# Marketing Engine — Coupons, Bundles, Loyalty, Newsletter

## Promotions (Coupon + Bundle)
`PromotionsService.validateCoupon()` is the single source of truth for discount math — cart
and checkout call this rather than re-implementing percentage/fixed/free-shipping logic
client-side, so what a buyer sees previewed is exactly what checkout will charge.
`FREE_SHIPPING` coupons signal the delivery module to zero the fee rather than computing a
negative cart discount.

## Bundles
`Bundle`/`BundleItem` — a fixed group of products at a set discount percentage. Powers the
homepage "Bundles" section. No dynamic/algorithmic bundling (e.g. "frequently bought
together") in this pass — that's a recommendation-engine feature, not a bundling feature, and
wasn't in scope here.

## Loyalty
**Points-per-Rand and tier thresholds in `loyalty.service.ts` are placeholder assumptions,
explicitly commented as such** — these are real business decisions for Fortune to set, not
technical choices. The mechanism (award on order completion, tier re-evaluation, transaction
history) is real; the numbers are not final.

## Newsletter + abandoned-cart recovery
`NewsletterSubscriber` — straightforward subscribe/unsubscribe. `AbandonedCartLog` sits in the
newsletter module (not cart) because it's a marketing-recovery concern reading cart state, not
cart business logic itself — logged via `NewsletterService.logAbandonedCart()`, called from a
scheduled job that checks `Cart.updatedAt` for staleness (job itself not yet implemented —
the logging hook is).

## What's NOT built
The actual multi-channel recovery sequence (Email → WhatsApp → SMS, escalating), welcome
series, and win-back campaigns are marketing-automation workflows that sit on top of this data
model, not additional schema — they're BullMQ job definitions for Phase 2.
