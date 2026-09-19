# AGENTS.md — Coding Rules for Human & Agentic Contributors

**A Specialised Operating Division of Besbpo Group.**
This file governs any contributor — human or AI agent (Claude Code, OpenHands, etc.) — working
in this repository. Read this before generating or editing any file.

## File size policy

| Band | Line count | Rule |
|---|---|---|
| Standard | 250–850 | Target range for any file containing real logic (services, controllers, non-trivial components) |
| Hard cap | 1,800 | No file may exceed this without an explicit `// FILE-SIZE-EXCEPTION:` comment at the top explaining why |
| Ultimate cap | 2,500 | Absolute ceiling — never exceeded, even with an exception comment. A file approaching this is split, not padded to fit |

**What's exempt from the 250-line floor:** type-only files (DTOs, interfaces, enums), single-purpose
config files, and index/barrel files. A 12-line DTO is correct at 12 lines — never pad a file to
hit a number. The floor exists to catch under-factored logic (a service doing almost nothing),
not to penalize genuinely small, complete files.

**When a file is approaching the hard cap:** split by responsibility, not by line count alone —
e.g. a growing `orders.service.ts` splits into `orders.service.ts` (orchestration) and
`order-status.service.ts` (status-transition logic), not into `orders.service.1.ts` /
`orders.service.2.ts`.

**Generated files** (Prisma client output, `dist/`, `.next/`) are exempt entirely — this policy
governs source files a person or agent writes, not build output.

## Module boundaries

One NestJS module = one bounded business concern (see `docs/15-api-modules.md` for the list).
A module's `service.ts` never reaches into another module's Prisma models directly for
*business logic* — it calls the owning module's service. Direct Prisma reads across module
boundaries are acceptable for simple lookups (e.g. `orders` reading a `Product` name for a
receipt) but never for anything with business rules attached (pricing, routing, compliance
gating) — those always go through the owning module.

## Naming conventions

- Files: `kebab-case.ts` — matches the NestJS/Next.js community convention already used
  throughout this repo.
- Prisma models: `PascalCase` singular (`Product`, not `Products`).
- Enums: `SCREAMING_SNAKE_CASE` values, `PascalCase` type name.
- React components: `PascalCase.tsx`, one component per file, matching filename.
- Routes: match the URL path exactly (`app/catalogue/[category]/page.tsx` → `/catalogue/:category`).

## Comments as decision records

Every non-obvious architectural choice gets a one-line comment explaining *why*, not *what* —
matching the style already used throughout this codebase (see `cmi-routing.service.ts` for the
pattern). A future agent picking up this repo should be able to understand a decision's
rationale without searching chat history or docs.

## What agents must NOT do unprompted

- Never invent a third-party company name, API key format, or URL that wasn't confirmed by the
  person or found via verified search — use a clearly-marked placeholder instead
  (`process.env.PROVIDER_NAME_HERE`) and flag it in the PR/response.
- Never mark a stub as "done" — a scaffold file gets a `// TODO(phase-2):` comment naming what's
  still missing, not silence.
- Never delete or rewrite another module's files to "clean up" without being asked.
- Never commit real secrets, API keys, or credentials — `.env.example` only, real values live in
  the deploy platform's secret store (Coolify/Render per the Group standard).

## Testing expectation (Phase 2+)

Every service file gets a co-located `.spec.ts` once its logic is non-trivial (more than simple
CRUD). Phase 1 scaffold files are exempt — see `docs/16-roadmap.md`.

## Documentation expectation

A new module ships with a corresponding `docs/NN-module-name.md` guideline doc — this repo has
never shipped a module without one, and that's a rule, not a coincidence.
