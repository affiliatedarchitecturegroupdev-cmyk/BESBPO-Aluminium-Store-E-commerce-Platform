# Search & Sector Filtering

## Filter model
Mirrors the corporate site's sector-filterable gallery exactly: Commercial / Industrial /
Institutional / Residential, driven by the `Segment` enum already on `Product`. A product can
carry multiple segments (e.g. a security door is both Industrial and Residential).

## Search
Full-text search across `Product.name`, `configuration`, and `SubCategory.name` — Postgres
`tsvector` rather than a separate search service for v1, revisited only if catalogue growth or
query volume makes it necessary (2,147 SKUs is well within Postgres full-text search's
comfortable range).

## Category-first vs search-first browsing
Given the configurator-heavy shopping pattern (see `03-configurator-spec.md`), category
navigation is the primary path and search is secondary — most buyers know they want "a sliding
door" and need to configure it, not free-text search across the whole catalogue.
