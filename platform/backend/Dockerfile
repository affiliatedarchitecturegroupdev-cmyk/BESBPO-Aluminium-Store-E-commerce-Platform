# Backend image (NestJS + Prisma).
#
# Multi-stage: the builder installs dev dependencies and compiles, the runtime ships only the
# compiled output and production dependencies. That keeps the final image from carrying the
# TypeScript toolchain, which matters for Render's image-size limits and cold-start time.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Prisma picks its query-engine binary at `prisma generate` time by probing for openssl. The
# slim image has libssl3 but no `openssl` binary, so the probe fails and Prisma silently
# defaults to the openssl-1.1.x engine — which then cannot load at runtime (libssl.so.1.1 does
# not exist on bookworm). Installing openssl makes the probe resolve to the 3.0.x engine that
# actually matches the system.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy manifests first so `npm ci` is cached independently of source changes.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# `prisma generate` must run before `nest build` — the service imports the generated client.
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Same openssl requirement as the builder: `npm ci` here re-runs `prisma generate` via the
# postinstall hook, and the engine binary it writes must match this system.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Dropping to the image's unprivileged `node` user; the app needs no filesystem writes.
USER node
EXPOSE 4000
CMD ["node", "dist/main"]