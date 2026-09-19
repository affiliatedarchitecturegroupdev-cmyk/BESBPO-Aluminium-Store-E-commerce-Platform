# In-Store Ad Placement Cards

## Model
`Advertisement` — 8 numbered slots (1-8), each holding one active campaign at a time, shown
between homepage sections. `AdvertisementsService.getActiveBySlot()` respects an optional
campaign date window (`startAt`/`endAt`) and returns exactly one ad per slot, so scheduling a
future campaign doesn't require deleting the current one — it just doesn't show yet.

## Placement philosophy
These are **internal promotional placements** (own-brand campaigns, seasonal pushes, category
spotlights) — not a third-party ad-serving system. No bidding, no external ad network
integration. If Aluminium Store ever wants to sell ad space to external advertisers (e.g. a
glass supplier paying for placement), that's a materially different product requiring its own
scope discussion.

## Where the 8 slots sit
Between the 15+ homepage sections — exact slot-to-section mapping is a homepage layout
decision made in the frontend, not enforced by the schema (a slot is just a number; nothing
ties slot 3 to "after Trending" at the data layer).
