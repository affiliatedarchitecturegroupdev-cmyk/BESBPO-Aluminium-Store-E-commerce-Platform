# Delivery, Courier & Location

## Delivery-zone model
`DeliveryZone` mirrors the Pricing Framework's Delivery & Additional Charges sheet exactly:
30km radius bands from the nearest qualifying hub/yard, weight-banded base fee, plus an 8%
fragile-goods handling surcharge applied whenever the order contains glazed units, curtain-wall
panels, or shopfront glass panels.

## Courier assignment
- Standard/small items: external parcel courier (rate-shopped at checkout)
- Fragile/glazed items: **Besfleet** (the Group's own trucking division) is the default option,
  consistent with the internal-option pattern already identified on Roofsteel — A-frame/stillage
  transport with proper load-securing for glass cargo is a distinct handling class from
  bar/profile stock, and an external general parcel courier is not assumed capable of it
- Oversized loads (long extrusion runs, large structural members): flagged for manual
  abnormal-load permit check before dispatch, never auto-booked

## Location-aware quoting
`Location.province` plus the buyer's delivery address province drives both the delivery-zone
fee lookup and, for CMI-routable orders, the partner-proximity filter in the routing engine —
one province field, two consumers.
