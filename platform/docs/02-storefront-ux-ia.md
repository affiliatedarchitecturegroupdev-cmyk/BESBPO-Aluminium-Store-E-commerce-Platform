# Storefront UX & Information Architecture

## Top-level IA
- `/` — homepage (hero, category grid, showcase — mirrors the corporate site's Skyline design)
- `/catalogue` — full catalogue, sector-filterable (Commercial/Industrial/Institutional/Residential)
- `/catalogue/[category]` — one of 7 categories
- `/catalogue/[category]/[subcategory]` — one of 31 sub-categories, with the configurator entry point
- `/product/[sku]` — single SKU detail + configurator
- `/quote/new` — RFQ builder for project-scale or CMI-routed work
- `/account`, `/account/orders`, `/account/trade` — buyer account area
- `/cmi-partners` — public-facing partner network page (trust-building for large clients)
- `/checkout` — cart → delivery → payment

## Design language
Reuses the Skyline system 1:1 from the corporate site and Brand Guidelines: Slate Ink / Glass
Blue / Pane White / Silver Mullion / Sunlit Brass, Space Grotesk/Inter/IBM Plex Mono, and the
windowpane-grid icon family already built for the marketing site — so a buyer moving from
besbpo-corporate content into the store never hits a visual seam.

## Category browsing vs configurator
Category and sub-category pages are **stock-keeping unit browsers** (fast, filterable, grid of
cards) — the configurator only appears once a sub-category is chosen, avoiding a 2,147-row
product grid that would overwhelm a first-time buyer. This mirrors how the corporate site's
gallery already separates "browse by sector" from "browse by category."
