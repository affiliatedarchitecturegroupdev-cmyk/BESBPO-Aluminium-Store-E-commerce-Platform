# Compliance Document Attachment

## Why this is a first-class feature, not an afterthought
The Compliance & Regulatory Framework identifies NRCS VC 9003 (Compulsory Specification for
Safety Glass) as a hard legal requirement touching nearly every SKU — this is not a
nice-to-have certificate library, it is a gating requirement.

## Model
`ComplianceDoc` attaches to one or more `Product` records via an implicit many-to-many
relation, carrying `standard` (e.g. "NRCS VC 9003", "AAAMSA Performance Cert", "SAFIERA Energy
Rating"), `docType`, `issuer`, and an optional `fileUrl` for the actual certificate PDF.

## Enforcement points
- A `GlazingPackage` cannot be enabled for sale unless `nrcsApproved = true` is set for its
  linked safety-glass compliance record
- Order confirmation emails and the order detail page list every compliance document relevant
  to the items purchased — giving trade buyers the documentation trail they need for their own
  NHBRC or municipal building-plan submissions (see the Compliance Framework's NHBRC
  Pass-Through section)
- CMI-routed orders require the assigned partner's own `nrcsApproved`/`aaamsaMember` flags to
  be true before the order can move to `ROUTED_TO_CMI_PARTNER` — the routing engine will not
  suggest a non-compliant partner

## Open item
Per the Compliance Framework's own flagged open items, NRCS approval status for each
prospective glass supplier and CMI partner still needs confirming directly before onboarding —
this platform enforces the flag, it does not verify it independently.
