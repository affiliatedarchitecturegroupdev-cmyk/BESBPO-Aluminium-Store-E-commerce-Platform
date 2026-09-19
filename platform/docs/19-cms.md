# Content Management System (CMS)

Distinct from the **catalogue CMS** described in `04-catalogue-cms.md` (which manages
products/SKUs) — this CMS manages the storefront's editable marketing surfaces.

## What it manages
- **Hero slides** — the corporate/storefront homepage's rotating hero (see the corporate
  site's 5-slide hero slider — this CMS is how merchandising staff change those slides'
  copy, image, and link without a code deploy)
- **Promotional banners** — sitewide or category-scoped announcement strips
- **Category feature callouts** — the "why this category" copy blocks on category pages
- **SEO metadata** — per-page title/description overrides
- **Media library** — a shared pool of uploaded images (product lifestyle shots, banner
  art) with tags, reused across content blocks rather than re-uploaded per block

## Model
`ContentBlock` — one row per editable surface, keyed by a human-readable `key` (e.g.
`"homepage-hero-slide-1"`), typed by `ContentType`, with `published`/`publishAt` so
content can be prepared ahead of a campaign and go live on a schedule.

`MediaAsset` — uploaded files with `tags` for library search; the actual binary upload
goes directly to Supabase Storage from the admin frontend, with this table only recording
the resulting URL and metadata (see `cms.controller.ts`'s comment on the upload endpoint).

## Publish workflow
Content is created/edited in a draft (`published: false`) state, previewed by staff, then
explicitly published via a separate endpoint (`PATCH /cms/content-blocks/:key/publish`) —
never published as a side effect of saving, so a half-finished edit never accidentally
goes live.

## Audit trail
`ContentBlock.updatedBy` records which staff `User.id` last touched a block — lightweight,
but enough to answer "who changed the homepage hero" without a full revision-history system
in v1.
