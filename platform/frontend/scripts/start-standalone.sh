#!/usr/bin/env bash
# Production start for the storefront, for hosts that run `npm run start` directly (Render's
# native Node runtime). The image path does not need this — the Dockerfile copies the assets in.
#
# next.config.js sets `output: 'standalone'`, which emits a self-contained server bundle but
# deliberately does not copy `public/` or `.next/static/` into it; those are expected to sit
# beside the bundle at runtime. `next start` additionally warns that it does not support
# standalone output. So this stages the two asset trees where the standalone server looks for
# them and then runs that server, which is the entry point Next.js documents for this mode.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .next/standalone/server.js ]; then
  echo "error: .next/standalone/server.js is missing — run 'npm run build' first" >&2
  exit 1
fi

mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -R public .next/standalone/public
fi

# Exec so the server is PID 1 and receives the platform's stop signal directly.
exec node .next/standalone/server.js