# Tech Stack

Consistent with the Group standard (see `tech-stack` preferences) and the proven
Bellwether SWE Plumbers / Roofsteel pattern.

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind | SSR for catalogue SEO, matches Group front-end convention |
| Backend API | NestJS (TypeScript) | Modular, matches Roofsteel/Bricksplaza backend shape |
| Configurator/pricing microservice | FastAPI (Python) | Reuses the Pricing Framework's cost-engine logic directly (same team already owns it in Python/openpyxl) |
| Job queue | BullMQ on Upstash Redis | Async CMI-routing decisions, compliance-doc generation, freight recalculation |
| Database | PostgreSQL via Supabase, af-south-1 | Group standard, data sovereignty |
| File/image storage | Supabase Storage | Product images, compliance certificates |
| IaC | Terraform / Terragrunt | Group standard |
| Deploy | Coolify on EC2; Render as fallback (Roofsteel/Bricksplaza precedent) | Group standard |
| GitOps | ArgoCD | Group standard |

## Why not the blueprint's polyglot vision
The original Manus AI blueprint proposed a Go/Rust/Elixir services split. As with Roofsteel,
this is dropped in favour of the Next.js+NestJS+FastAPI stack already proven in production on
Bellwether SWE Plumbers — lower hiring risk, faster HITLAD iteration, and one fewer runtime to
operate across the Group's growing division count.

## Estimated scope
Working estimate: **34,000–42,000 LoC**, benchmarked against Bellwether SWE Plumbers' actual
35,521 LoC and adjusted upward for the configurator and CMI-routing surface area, which
Roofsteel's Made-to-Length configurator only partially anticipated.
