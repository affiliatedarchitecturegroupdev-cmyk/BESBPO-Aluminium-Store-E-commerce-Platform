# Deployment — Render

`render.yaml` at the repository root is the source of truth. Render is the
target platform for this division; the Group's Coolify-on-EC2 standard does not apply here.

## Services

The blueprint declares four resources, all in one region so the internal network is available:

| Resource | Type | Purpose |
|---|---|---|
| `aluminium-store-db` | PostgreSQL 16 | Primary datastore |
| `aluminium-store-pricing` | Python web service | FastAPI price engine (configurator) |
| `aluminium-store-api` | Node web service | NestJS API |
| `aluminium-store-storefront` | Node web service | Next.js storefront |

Region is currently `frankfurt` because Supabase's `af-south-1` is not a Render region. If data
sovereignty requires a South African region, the alternative is to keep the database on Supabase
and point `DATABASE_URL` at it, leaving the three web services on Render. That decision is open —
see `docs/17-open-questions.md`.

## Environment variables

Secrets are marked `sync: false` in the blueprint and entered in the Render dashboard. Never
commit real values — `.env.example` files list the keys only.

### API (`aluminium-store-api`)

| Key | Source |
|---|---|
| `DATABASE_URL` | Provisioned from `aluminium-store-db` |
| `JWT_SECRET` | Dashboard secret. **Must be at least 32 characters** — the app refuses to boot in production if it is shorter |
| `PRICING_SERVICE_URL` | Provisioned from the pricing service |
| `CORS_ORIGINS` | Provisioned from the storefront host |
| `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `LULAPAY_API_KEY`, `PAYJUSTNOW_API_KEY` | Dashboard secrets, once the gateways are contracted (Phase 3) |

### Storefront (`aluminium-store-storefront`)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api/v1` — relative, so browser calls go same-origin and CORS never applies |
| `BACKEND_ORIGIN` | Provisioned from the API service. The Next.js rewrite and server components proxy through this |
| `NEXT_PUBLIC_SITE_URL` | The storefront's own public host |

Render service host variables arrive **without a scheme**. `next.config.js` and `lib/api.ts` add
`https://` when it is missing, so `BACKEND_ORIGIN=api.onrender.com` resolves correctly.

## Migrations

`startCommand` runs `npx prisma migrate deploy` before `node dist/main`. This runs at release
time rather than in `buildCommand` because the build environment cannot reach the private
database URL. `migrate deploy` is idempotent and takes an advisory lock, so restarts and
multiple instances are safe.

## Health checks

`GET /api/v1/health` is the API's health check. It returns 200 only when a `SELECT 1` against
the database succeeds; otherwise it returns 503, which stops Render promoting a release with no
working database.

## Verifying a deploy

```bash
curl https://<api-host>/api/v1/health
# {"status":"ok","database":"ok","uptimeSeconds":12,"checkedInMs":3}

curl -o /dev/null -s -w '%{http_code}\n' https://<storefront-host>/
# 200
```

## Local equivalents

`docker-compose.yml` orchestrates postgres, redis, and all three services for local development.
Note that `docker-compose.yml` still describes the Coolify/EC2 target in its header comment; the
Render blueprint is authoritative for this division.