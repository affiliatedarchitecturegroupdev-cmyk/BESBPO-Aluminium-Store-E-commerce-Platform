# Checkout & Fulfilment Timing

## Checkout steps
1. Cart review (shows Retail/Trade/Volume price per the buyer's tier)
2. Delivery address + delivery-zone fee calculation (see `09-delivery-courier.md`)
   - The buyer picks a saved address or, on first checkout, captures one inline. The address is
     persisted through the `addresses` module (see `36-delivery-addresses.md`) and sent as
     `deliveryAddressId`.
   - **The province is required.** It drives the delivery-zone lookup; if it is omitted and no
     saved address supplies one, the lookup matches no zone and the fee would silently price at
     **R0** — free delivery to anyone who left the field out. Checkout therefore rejects the order
     with a 400 rather than accepting a mis-quoted total.
   - When a saved address is supplied it is the **authority** for the province, and it must belong
     to the caller — `orders.service.ts` verifies ownership via
     `AddressesService.findOwned()` before writing `deliveryAddressId`. A client-supplied
     `deliveryProvince` alongside a saved address cannot override the address's own province, so a
     tampered payload cannot buy a cheaper zone.
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
