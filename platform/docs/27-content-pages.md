# Content Pages — Blog, FAQ, Store Locator

## Blog
`BlogPost` — simple, deliberately not over-engineered (no CMS-style block editor; a blog post
is one Markdown/HTML body field). If the CMS's `ContentBlock` model later needs blog-specific
block types, that's a Phase 2 evaluation, not a Phase 1 assumption.

## FAQ / Help Center
`FaqItem`, grouped by `category` ("Ordering", "Payment", "Delivery", "Returns", "Technical
Specs"). Deliberately positioned as the **first content source to seed the AI agent's
`KnowledgeBaseEntry` table from** — see `docs/30-ai-support-agent.md` — since a well-maintained
FAQ is already curated, reviewed knowledge, not draft content.

## Store Locator + Click & Collect
Reuses the existing `Location` model (already used for stock levels and hub-capacity) rather
than a new model — a store locator is a customer-facing view over data that already exists in
`Location.isHub`/`Location.address`/`Location.province`. Click & Collect order routing means an
`Order.deliveryAddress` can resolve to a `Location` rather than only a buyer `Address` — worth
a schema addition (`Order.pickupLocationId`) once the ordering flow for it is confirmed; not
yet added since the exact UX (pick at cart vs. pick at checkout) isn't decided.

## About Us / Contact Us
Static content — served via `ContentBlock` (CMS module) rather than dedicated models, since
these are exactly the kind of editable marketing surface the CMS already exists for.
