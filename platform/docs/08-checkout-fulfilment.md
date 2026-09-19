# Checkout & Fulfilment Timing

## Checkout steps
1. Cart review (shows Retail/Trade/Volume price per the buyer's tier)
2. Delivery address + delivery-zone fee calculation (see `09-delivery-courier.md`)
3. Payment method selection (see `11-payments.md`)
4. Order confirmation — generates `orderNumber`, attaches applicable `ComplianceDoc` records

## Fulfilment-timing expectations shown to the buyer
- **Stock** items: standard lead time, shown as a date range at checkout
- **Made-to-Order** items: longer lead time band, explicitly flagged as such before payment
  is taken — not discovered after the fact
- **CMI Partner Network** items: no fixed lead time shown pre-routing; buyer is told fulfilment
  time will be confirmed once a partner is assigned (`ROUTED_TO_CMI_PARTNER` status), consistent
  with the "quote individually" language already used on the Made-to-Order lead-time line in
  the Pricing Framework's Delivery & Additional Charges sheet

## Non-returnable enforcement
`OrderItem.nonReturnable` is set `true` automatically for any line where `fulfilmentType !=
STOCK` — matching the non-returnable policy already enforced in schema on Roofsteel for its
Made-to-Length/Cut-to-Order/Fabricated-to-Order items, extended here to cover custom glazing
configurations as well.
