# CMI Partner Routing Engine

## The problem this solves
Large curtain-walling, shopfront, and structural-glazing orders exceed any single Aluminium
Store hub's fabrication capacity. The CMI (Contract Manufacturing Issuer) model — the same
concept already proven on Roofsteel — routes that overflow to a vetted partner network while
keeping the spec, quality standard, and brand promise centrally issued.

## Routing triggers
An order or quote is flagged `ROUTED_TO_CMI_PARTNER` when:
- `fulfilmentType = CMI_PARTNER_NETWORK` on any line item (Curtain Walling & Structural
  Glazing sub-category, most Shopfront Systems lines), OR
- Total quoted area exceeds a configurable hub-capacity threshold (default 150m² per order),
  OR
- A buyer explicitly requests CMI-network fulfilment from the RFQ form

## Partner selection
`CMIPartner` records carry `province`, `capabilities`, `capacityM2PerMonth`, and compliance
flags (`nrcsApproved`, `aaamsaMember`). The routing job (BullMQ) filters partners by province
proximity to the delivery address, matching capability tag, and available capacity, then
surfaces a ranked shortlist to an Aluminium Store staff member for manual confirmation —
**routing suggests, a human approves**, consistent with the Group's "AI proposes, humans
approve" governance principle.

## What travels with a CMI-routed order
The full `configSnapshot`, the buyer's compliance requirements, and delivery details are
passed to the partner via a structured handoff document (not just a phone call) — the same
specification discipline the Compliance & Regulatory Framework already requires for in-house
production.
