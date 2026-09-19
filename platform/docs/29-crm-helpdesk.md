# CRM & Helpdesk — Scope Note

## Why this is a scaffold, not a full CRM
A real CRM (360° customer profile, CLTV computation, segmentation tags, an omnichannel inbox
that actually threads Email/Chat/WhatsApp into one view) is a product category in its own
right — the honest scope conversation before this build flagged it as a large sub-project, and
that assessment hasn't changed.

## What's actually built
`SupportTicket`/`SupportMessage` — a real, working ticket model with a status lifecycle
(`OPEN → PENDING_CUSTOMER → RESOLVED → CLOSED`) and priority levels, plus the crucial
integration point: a ticket can carry a `chatSessionId`, linking it back to the full AI-agent
conversation transcript when a chat escalates to a human (see
`AiAgentService.escalateToHuman()`).

## What's NOT built
- CLTV computation, customer segmentation tags, and a unified 360° profile view
- True omnichannel threading (a WhatsApp reply and an email reply to the same issue appearing
  as one conversation) — channel is currently a label (`SupportChannel`), not a merged thread
- Any helpdesk UI beyond the API — `docs/22-service-providers.md` recommends evaluating
  Freshdesk or Zendesk before building this further in-house

## Recommended next step
Before investing further engineering here, confirm whether a bought helpdesk tool covers 80%
of the need — building a competitive CRM/helpdesk from scratch is rarely the right call before
support volume justifies it.
