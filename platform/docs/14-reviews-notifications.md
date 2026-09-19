# Reviews & Notifications

## Reviews
Simple 1–5 star + optional comment, tied to `Product` and a verified `User` who has an
`OrderItem` for that product — no anonymous reviews, consistent with reducing fake-review risk
on a B2B-leaning platform.

## Notification events
- Order status changes (`PAYMENT_CONFIRMED`, `IN_FABRICATION`, `ROUTED_TO_CMI_PARTNER`,
  `IN_TRANSIT`, `DELIVERED`)
- Quote status changes (`QUOTED`, `ACCEPTED`)
- Trade account approval/decline
- Compliance document attached to an order (buyers who need it for their own submissions get
  it proactively, not only on request)

## Channel
Email first (transactional, via the existing Group email infrastructure); SMS deferred to a
later phase unless delivery-day coordination proves email insufficient in practice.
