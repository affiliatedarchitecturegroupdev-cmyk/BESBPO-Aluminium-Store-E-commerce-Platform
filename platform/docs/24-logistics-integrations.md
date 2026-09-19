# Logistics Integrations — Couriers & PUDO Network

## Two distinct concerns, two modules
`delivery` (existing) owns **fee/zone calculation** — the weight-banded, distance-banded
pricing model from the Pricing Framework. `logistics` (new) owns the **courier directory and
pickup-point network** — a different concern with a different data shape.

## Courier directory
`Courier` records the multi-carrier options (Bob Go as aggregator, or direct integrations
with The Courier Guy/RAM/Aramex) — `LogisticsService.suggestCourierForShipment()` defaults
fragile-glazed shipments to Besfleet (the Group's own fleet) rather than a general parcel
courier, consistent with the Compliance Framework's handling-class distinction.

## PUDO / pickup-point network
`PickupPoint` covers Pargo and PostNet networks — a map-based selector at checkout, filtered
by province. Bob Box lockers were in the original blueprint but are not yet a confirmed live
integration partner as of this scaffold; add as a third `PudoNetwork` enum value once
confirmed.

## What's NOT yet real
The actual courier API calls (live rate quoting, waybill generation, tracking webhook
ingestion) are not wired — `LogisticsService` returns a suggestion, not a booked shipment.
See `docs/22-service-providers.md` for the shortlist of aggregators to integrate against in
Phase 2.
