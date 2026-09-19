# Aluminium Store Platform — Overview

## What this is
The Aluminium Store e-commerce and configuration platform: a single-vendor B2B/B2C system for
browsing, configuring, quoting, and ordering the full 2,147-SKU catalogue, routing large or
custom work through the CMI (Contract Manufacturing Issuer) partner network, and managing
delivery of both stocked and fragile glazed product nationally.

## Relationship to the Group blueprint
This platform adapts the Besbpo Group's generic **Standard E-Commerce Platform Framework
Blueprint** (Manus AI, marketplace-style, Takealot/Sixty60 reference) to a **single-vendor,
configuration-heavy** model — closer in shape to the Bellwether SWE Plumbers and Roofsteel
platforms than to a multi-seller marketplace. The blueprint's marketplace-specific features
(multi-vendor onboarding, seller payouts, commission handling) are **dropped**; its storefront,
cart, checkout, and account primitives are **adapted**.

## What makes this platform different from Roofsteel's
- A **configurator** is central, not optional — nearly every window/door SKU carries a size,
  finish, and glazing-package selection that changes the price live (see `03-configurator-spec.md`).
- **CMI partner routing** is a first-class order-status path, not a manual workaround — large
  curtain-walling and shopfront orders can be routed to a vetted partner fabricator mid-order.
- **Fragile-goods logistics** (glazed units, curtain-wall panels) is a distinct shipment class
  with its own handling surcharge, not a generic freight line.
- **Compliance documents** (AAAMSA certs, NRCS VC 9003 approval, SAFIERA ratings) attach at the
  product level and travel with the order, since several are legally required, not optional.

## Document set
This `docs/` folder is the full guideline cluster referenced from the Technical & Product
Specification (see the companion PDF). Eighteen documents, one concern each — read the spec
first for the executive summary, then this folder for implementation detail.
