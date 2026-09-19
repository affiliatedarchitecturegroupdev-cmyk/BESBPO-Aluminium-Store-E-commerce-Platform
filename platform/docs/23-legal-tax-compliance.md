# Legal & Tax Compliance (ECTA / POPIA / PAIA / CPA / SARS)

## What's modelled and why
| Requirement | Model(s) | Enforcement point |
|---|---|---|
| ECTA Section 43 disclosure + 7-day cooling-off | `LegalDocument` (TERMS_AND_CONDITIONS) | Displayed at checkout; acceptance recorded per version |
| POPIA privacy notice + DSAR | `LegalDocument` (PRIVACY_POLICY), `DsarRequest` | Self-service submission; admin review queue, never auto-approved for DELETION |
| PAIA manual | `LegalDocument` (PAIA_MANUAL) | Static page + downloadable PDF, per the mandatory-disclosure requirement |
| CPA 6-month implied warranty | `LegalDocument` (RETURNS_REFUNDS) | Disclosure text; `ReturnRequest` enforces the actual return workflow |
| SARS Tax Invoice | `Invoice` | Generated on order completion — see below |

## VAT rate
Modelled at 15% (`Order.vatAmount`, `LegalTaxService.calculateVat`). Verified current as of the
2026 Budget (25 February 2026) — the 2025-proposed increases to 15.5%/16% were both reversed
and not revived. **Re-verify before relying on this constant in a future financial year** —
VAT changes are announced in the annual Budget Speech, not silently.

## Invoice numbering
Sequential, prefixed `ALS-INV-{year}-{6-digit-sequence}`, generated only after payment
confirmation (never for a `PENDING` order) — a Tax Invoice implies a completed sale, per SARS
convention. The current implementation counts existing invoices to derive the next number;
Phase 2 should replace this with a proper DB sequence to eliminate the race-condition risk
noted in `legal-tax.service.ts`.

## Non-returnable enforcement (ECTA Section 42(2))
Made-to-order and personalised goods are excluded from the cooling-off right by law, not just
by policy. `OrderItem.nonReturnable` is set at order time; `ReturnsService` re-checks it
server-side and auto-rejects (with a logged, visible reason) rather than silently blocking —
see `docs/28-back-office-extras.md`.

## Who needs to sign off before launch
A POPIA-accredited Information Officer and the Group's tax advisor — this document describes
what the platform enforces, not a substitute for that professional review. See
`docs/22-service-providers.md`.
