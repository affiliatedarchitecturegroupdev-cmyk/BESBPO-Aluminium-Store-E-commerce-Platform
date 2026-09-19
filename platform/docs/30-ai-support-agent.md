# AI Support Agent — Scope Note

## What's real in this scaffold
- `ChatSession`/`ChatMessage` — full conversation persistence
- Keyword-based escalation triggers (`"speak to a person"`, `"refund"`, etc.) that route to
  `SupportService.createFromChatEscalation()`, creating a real, linked `SupportTicket`
- `KnowledgeBaseEntry` — the table structure a real retrieval system would query

## What's explicitly NOT real yet
- The actual LLM call. `AiAgentService.handleUserMessage()` returns a structured placeholder
  response, clearly commented as such — it does not fake a generative-sounding reply.
- Vector-similarity knowledge retrieval. The current `searchKnowledgeBase()` is a naive
  substring match, not embedding-based search — sufficient to prove the data flow, not to
  answer a real product question well.

## The intended real architecture (Phase 2)
1. Seed `KnowledgeBaseEntry` from the FAQ (`docs/27-content-pages.md`), the Pricing Framework,
   the Compliance & Regulatory Framework, and the Master Product Catalogue — each entry
   carries a `sourceRef` for traceability back to the document it came from.
2. Embed each entry (pgvector, per `docs/22-service-providers.md`) rather than a Postgres
   `LIKE` query.
3. Route each user message through Claude (Anthropic), grounded by the top-N retrieved
   knowledge entries plus live reads from `catalog`/`configurator`/`orders` for
   account-specific questions.
4. Keep the escalation logic exactly as scaffolded — a good agent still needs a fast, reliable
   path to a human, and that path is already real.

## Why this matters to get right, not fast
A support agent giving a confidently wrong price or lead-time is worse than no agent — the
placeholder response in this scaffold is deliberately unconfident ("pending Phase 2 LLM
wiring") rather than a plausible-sounding fabrication, and that discipline should carry into
the real implementation's prompt design too.
