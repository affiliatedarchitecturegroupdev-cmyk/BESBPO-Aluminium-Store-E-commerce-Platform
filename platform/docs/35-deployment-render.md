# Deployment — Render

`render.yaml` at the repository root is the source of truth. Render is the
target platform for this division; the Group's Coolify-on-EC2 standard does not apply here.

## Deploy from the Blueprint, not as a standalone Web Service

Create the resources with **New → Blueprint** and point it at this repository. Do *not* create the
API or storefront with **New → Web Service** and then paste the build command in by hand.

The distinction matters because `render.yaml` carries three things a hand-made service does not,
and each fails in a way that does not name its cause:

| Blueprint field | If absent | How it looks |
|---|---|---|
| `rootDir: platform/frontend` | Render builds the repository root | `npm error enoent Could not read package.json: /opt/render/project/src/package.json` — there is no root `package.json`, the app is in `platform/` |
| `NODE_VERSION: 20.18.0` | Render uses its default (currently Node 24) | Builds or runs against a Node the app was never tested on; Prisma and Next.js are the likely breakages |
| `fromService` / `fromDatabase` | Nothing wires `BACKEND_ORIGIN`, `PRICING_SERVICE_URL`, `DATABASE_URL` | The API boots with no database URL and the storefront proxies to an undefined host |

A hand-made service also defaults its build command to `npm install && npm run build`, which is
what produces the `package.json` error above when the root directory is left at the repository
root. The blueprint uses `npm ci` against the committed lockfiles instead.

**Symptom → cause.** A build log that begins `==> Using Node.js version <n> (default)` is proof
the service is not attached to this blueprint: every Node service here pins `NODE_VERSION`
explicitly, so a *default* version means the file was not read.

Secrets marked `sync: false` are still entered in the dashboard after the blueprint provisions the
stack — the blueprint creates the services, it does not know the secret values.

## `npm ci --include=dev` is deliberate

Both Node services set `NODE_ENV: production` in this file, and Render applies a service's
`envVars` **during the build**, not only at runtime. Under `NODE_ENV=production`, `npm ci` omits
`devDependencies`. The toolchain these builds need is in `devDependencies`:

| Service | Package | Needed by | If omitted |
|---|---|---|---|
| API | `@nestjs/cli` | `npm run build` (`nest build`) | `sh: 1: nest: not found` |
| API | `typescript` | Nest CLI's compiler | same failure |
| API | `prisma` | `npx prisma generate` | CLI missing — survives only because `@prisma/client` depends on it |
| Storefront | `typescript` | Next resolves the `@/*` alias through it | `Module not found: Can't resolve '@/lib/session'` |

So the build commands pass `--include=dev` explicitly. Dropping it to "slim the install" breaks
both builds, and neither error message names the real cause — one is a missing binary, the other
looks like a broken import path.

The runtime install being lean is a separate question from the build install: the built output
(`dist/` for the API, `.next/standalone` for the storefront) does not need the dev toolchain to
run, which is why the Dockerfiles can use `npm ci --omit=dev` in their runtime stages. The Render
native runtime has no separate build and run phases, so its single install must cover the build.

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
| `JWT_SECRET` | `generateValue: true` — Render generates a 256-bit value. **Must be at least 32 characters**; the app refuses to boot in production if it is shorter, and a hand-entered short value fails the deploy at run time with nothing naming the value as the cause. Generated once at service creation, then stable across deploys |
| `SEED_ADMIN_PASSWORD`, `SEED_TRADE_PASSWORD` | Dashboard secrets, required by the seed when `NODE_ENV=production`. The development defaults are published in this repository, so the seed refuses to run without them |
| `PRICING_SERVICE_URL` | Provisioned from the pricing service |
| `CORS_ORIGINS` | Provisioned from the storefront host |
| `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `LULAPAY_API_KEY`, `PAYJUSTNOW_API_KEY` | Dashboard secrets, once the gateways are contracted (Phase 3) |

### Storefront (`aluminium-store-storefront`)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api/v1` — relative, so browser calls go same-origin and CORS never applies |
| `BACKEND_ORIGIN` | Provisioned from the API service. The API proxy route and server components use this |
| `NEXT_PUBLIC_SITE_URL` | The storefront's own public host |

Render service host variables arrive **without a scheme**. The proxy route and `lib/api.ts` add
`https://` when it is missing, so `BACKEND_ORIGIN=api.onrender.com` resolves correctly. The API
does the same for `PRICING_SERVICE_URL` (`fromService` supplies a bare `host:port`), adding
`http://` because traffic between services stays on the private network. Without that, `fetch`
throws `TypeError: Failed to parse URL` — the URL parser accepts the scheme-less string, so the
failure happens at request time with nothing naming the cause.

### Why the API proxy is a route handler, not a rewrite

Browser calls use the root-relative `/api/v1/...`, proxied to the API by
`app/api/v1/[...path]/route.ts`. This is deliberately **not** a `next.config.js` `rewrites()`
entry. Next.js resolves rewrites during `next build` and bakes the destination into the route
manifest. On Render the build machine never receives `BACKEND_ORIGIN` (it is a runtime service
variable), so a rewrite would freeze `http://localhost:4000` as the proxy target and every
storefront API call would fail against a host that is not there. A route handler reads the
environment per request, so the Render-provided value is used without a rebuild.

The handler forwards the `Authorization` header (the shopper's JWT lives in localStorage and the
frontend sends it as a bearer token) and every HTTP method, and relays upstream status codes and
error bodies unchanged so client-side error handling still works.

## Images

Each service also has a `Dockerfile` for the container path (and for local `docker-compose`):

| Service | Base | Note |
|---|---|---|
| `pricing-service` | `python:3.12-slim` | Runs as `nobody` |
| `backend` | `node:20-bookworm-slim` multi-stage | Installs `openssl` — see below |
| `frontend` | `node:20-bookworm-slim` multi-stage | Uses Next.js `output: 'standalone'` |

The frontend image copies `public/` and `.next/static/` beside the standalone bundle explicitly,
because `output: 'standalone'` does not include them. The Render *native Node runtime* does not use
the Dockerfile, so it needs the same staging done at start time: `npm run start` runs
`scripts/start-standalone.sh`, which copies those two trees into `.next/standalone/` and then execs
`node .next/standalone/server.js`. This matters because Next.js warns that `next start` does not
support standalone output, and the bundle on its own serves the HTML but 404s every static asset.

That script also exports `HOSTNAME=0.0.0.0` before exec'ing. The generated `server.js` binds to
`process.env.HOSTNAME || '0.0.0.0'`, and Render sets `HOSTNAME` to the instance's own hostname —
which resolves to the instance's internal IP, not to every interface. Without the override the
storefront comes up listening on that one address, so a `curl` from inside the instance against
`localhost:$PORT` is refused while `http://$HOSTNAME:$PORT` answers, and the platform's health
check cannot reach the port. The Dockerfile already pins the same value with
`ENV HOSTNAME=0.0.0.0`; the native-runtime path had been relying on the default and so never had
the value set.

The backend image installs `openssl` in both stages. Prisma selects its query-engine binary at
`prisma generate` time by probing for OpenSSL. The slim image ships `libssl3` but no `openssl`
binary, so the probe fails, Prisma silently falls back to the `openssl-1.1.x` engine, and the
container then dies at boot with `libssl.so.1.1: cannot open shared object file`. Installing
`openssl` makes the probe resolve to the `3.0.x` engine that matches bookworm.

## Migrations and seeding

`preDeployCommand` runs `npx prisma migrate deploy && npm run prisma:seed` after the build and
before the new build is promoted. This runs at release time rather than in `buildCommand`
because the build environment cannot reach the private database URL. `migrate deploy` is
idempotent and takes an advisory lock, and the seed is idempotent too — every write is an upsert
or an existence check — so re-running both on every deploy is safe.

They previously sat at the front of `startCommand` (`npx prisma migrate deploy && node dist/main`).
A start command runs once per instance on every restart, which is the wrong place for a one-shot
database step, and it meant a fresh database was only ever migrated and never populated.

**The seed is not optional.** Nothing else populates the database, and the storefront renders an
empty catalogue without it: the 2,147 SKUs, the taxonomy the pricing service keys its assumption
tables off, and the clearance lines the homepage "Clearance Sale" section reads all come from it.

A fresh production database therefore needs `SEED_ADMIN_PASSWORD` and `SEED_TRADE_PASSWORD` set.
The development defaults used otherwise are published in this public repository, so the seed
refuses to run under `NODE_ENV=production` without them — otherwise they would become the live
admin and trade credentials on an internet-facing store.

## An unhealthy API blanks the storefront, and the storefront caches the result

The homepage and other catalogue pages are statically prerendered with `revalidate = 60`. When
the API is unreachable **at build time**, every `serverFetch` returns `null`, and each section
falls back to its static placeholder. The clearance shelf has no placeholder by design ("a
clearance shelf with nothing on it must disappear rather than advertise a made-up discount"), so
it is dropped entirely — a clearance section missing from a deployed bundle is not evidence that
the code is missing, only that the API was down when it was built.

The page then revalidates on the fetch interval, so it recovers on its own once the API is up.
Two things stop that recovery in practice:

- **The API is down for good.** While the API never deploys, the prerender is never refreshed.
- **Build-time fetch to `localhost`.** In a container that resolves `localhost` to `::1` while
  the API listens on IPv4, the build silently fetches nothing and bakes in the fallbacks.
  `BACKEND_ORIGIN` must be set on the storefront at build time — as `render.yaml` does via
  `fromService` — rather than relying on the `http://localhost:4000` default.

Both failures are silent: the build succeeds, the storefront returns 200, and the page simply
shows less than it should.

## A service whose deploys all fail answers 502 `no-deploy`

`x-render-routing: no-deploy` means Render has no successfully deployed instance to route to —
the service has never come up. It is a deployment-history symptom, not a code one: check whether
*any* deploy for that service ever succeeded before changing anything in the repository. A
sibling service that ships the same commit and is fine proves the code is not the cause.

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