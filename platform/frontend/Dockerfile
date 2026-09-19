# Frontend image (Next.js standalone output).
#
# `output: 'standalone'` is set in next.config.js, so the build emits a self-contained
# server bundle in .next/standalone. The runtime stage copies only that bundle plus static
# assets, instead of the whole node_modules tree.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The standalone server does not read next.config.js at runtime, so it needs no configuration
# files — only the bundle, plus the static and public assets it serves directly.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]