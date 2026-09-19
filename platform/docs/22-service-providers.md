# Service Provider Recommendations

Grounded, real-world options per category — not exhaustive, but each name below is a genuine,
operating provider as of this writing. Final selection is a business decision (pricing,
contract terms, support SLAs) outside this document's scope — this narrows the field, it
doesn't make the call.

## Payments
| Need | Providers |
|---|---|
| Card + Instant EFT (already planned) | PayFast, Ozow |
| Additional Instant EFT | Stitch, Capitec Pay |
| BNPL (already planned) | Lulapay (B2B), PayJustNow (retail) |
| Additional BNPL | PayFlex, Mobicred |
| QR / digital wallet | SnapScan, Zapper |
| Card processing infrastructure (alternative/backup rail) | Peach Payments, PayGate, iKhokha |

## Logistics & Courier
| Need | Providers |
|---|---|
| Multi-carrier rate-shopping + waybill API | Bob Go (formerly uAfrica), ShipLogic |
| Direct courier integration | The Courier Guy, RAM, Aramex, Fastway |
| PUDO / locker network | Pargo, PostNet |
| Own-fleet fragile-goods delivery | Besfleet (internal — Group's own trucking division) |

## Communications
| Need | Providers |
|---|---|
| WhatsApp Business API | Twilio, MessageBird (Bird), Infobip — all offer official WhatsApp Business Platform access |
| SMS gateway | Clickatell, BulkSMS (both SA-based, well-established) |
| Transactional email | Postmark, SendGrid, Amazon SES |

## Search
| Need | Providers |
|---|---|
| Typo-tolerant instant search (if Postgres full-text search proves insufficient at scale) | Meilisearch (self-hostable, matches the Group's af-south-1 data-sovereignty preference), Algolia (hosted, higher cost), Typesense (self-hostable alternative) |

## Analytics & Behaviour Tracking
| Need | Providers |
|---|---|
| Product analytics + session replay | PostHog (self-hostable, matches data-sovereignty preference; generous free tier) |
| Marketing/ecommerce analytics | Google Analytics 4 with Enhanced Ecommerce |
| Customer data platform (only if scale justifies it later) | Segment |

**Recommendation**: PostHog self-hosted (or PostHog Cloud EU) + GA4. Building a bespoke
analytics pipeline is rarely worth it before product-market fit is proven — see the earlier
scope discussion on this.

## AI / Support Agent
| Need | Providers |
|---|---|
| LLM for the context-aware support agent | Claude (Anthropic) — via the Claude API, consistent with the Group's existing Claude-based workflow |
| Vector store for the knowledge base | pgvector (Postgres extension — avoids adding a new database technology to the stack), or Pinecone if scale demands a managed alternative |
| Human escalation / helpdesk inbox | Freshdesk, Zendesk, or a self-built minimal ticket queue on the existing `SupportTicket` model (see `cmi-routing`-style architecture in the CRM module) |

## CMS / Content
| Need | Providers |
|---|---|
| Already covered by the custom CMS module | — |
| Landing-page builder (if the custom `ContentBlock` model proves too limited for marketing's needs) | Unbounce, or a headless approach with Builder.io |

## Infrastructure (already Group-standard — listed for completeness)
PostgreSQL via Supabase (af-south-1), Upstash Redis, AWS, Coolify on EC2, Terraform/Terragrunt,
ArgoCD — see `docs/01-tech-stack.md`. No change recommended here.

## Legal / Compliance
| Need | Providers |
|---|---|
| POPIA compliance review, PAIA manual drafting | A South African admitted attorney specialising in data protection (this is not a software vendor decision — get a real POPIA-accredited Information Officer sign-off before launch, per POPIA's own requirement that every responsible party appoint one) |
| SARS tax invoice / VAT compliance review | The Group's existing accounting/tax advisor, before the Invoice module goes live |

## Domain & DNS
`aluminium.store` — confirm registrar and DNS provider (Cloudflare is the common choice for
its free tier, DDoS protection, and easy Coolify/Render integration) once the domain is
registered.
