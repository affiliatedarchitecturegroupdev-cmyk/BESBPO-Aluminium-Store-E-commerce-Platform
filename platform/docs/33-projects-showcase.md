# Projects Showcase — Design → Manufacture → Install

## Purpose
Demonstrates the full CMI value chain in one place: Aluminium Store doesn't just sell product,
it designs (via Bellwether Architecture & Engineering), manufactures (own hubs + CMI partner
network), and installs. The homepage's installation/sales midsection features a **projects
hero slider** pulling from `Project` records marked `featured: true`.

## Model
`Project`/`ProjectImage` — a case study with a sector tag (reuses the existing `Segment`
enum), an optional link to a category, and an ordered image gallery. `featured` is a deliberate
curation flag, not "every project ever logged" — the slider should showcase the best examples,
not the most recent by default.

## Content sourcing
Real project photography and write-ups are a content-production task for the Group's
marketing team, not something this scaffold can generate — the model is ready to receive real
case studies as soon as they exist.
