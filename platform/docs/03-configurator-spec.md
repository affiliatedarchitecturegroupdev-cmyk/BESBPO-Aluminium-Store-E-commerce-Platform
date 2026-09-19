# Window & Door Configurator

The single most important interaction on the platform — nearly every Window and Door SKU is
actually a **configuration**, not a fixed product.

## Configurator inputs, per sub-category
1. **Configuration** (e.g. "2-Pane Slider", "Single Sash Side-Hung") — determines base geometry
2. **Standard size** — from the pre-approved AAAMSA-tested size list for that configuration
   (custom sizes route to Made-to-Order, see `06-cmi-partner-routing.md`)
3. **Finish** — one of the five standard finishes, live-swatched using the Finish.hex value
4. **Glazing package** — Standard Single-Glazed vs IGU Double-Glazed (or the sub-category's
   equivalent baseline/upgrade pair), price delta shown inline

## Live pricing
The configurator calls the **pricing microservice** (FastAPI) on every input change, which
runs the same Area Rate × (baseline + glazing upgrade) + hardware formula already built and
verified in the Pricing Framework workbook — the workbook is the source of truth for the
constants (`PricingAssumption`, `MarkupBand` tables), not a separate hand-maintained copy.

## Output
A `configSnapshot` JSON blob (width, height, finish, glazing, computed unit price) is attached
to the `CartItem` / `OrderItem` at add-to-cart time, so the exact configuration a buyer priced
is what ships — protecting both the buyer and Aluminium Store from later price drift if
assumptions change.

## Guardrails
- Sizes outside the AAAMSA-tested range for that configuration are blocked in the UI with a
  "request a custom quote" prompt into the RFQ flow, not silently priced — a certificate tested
  at one size does not cover a larger one (see the Compliance & Regulatory Framework, Section 4).
- Glazing packages not NRCS-approved for that product type are not selectable.
