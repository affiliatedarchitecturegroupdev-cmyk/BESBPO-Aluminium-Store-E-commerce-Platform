/** @type {import('next').NextConfig} */

// The backend API is a separate service (NestJS) on Render. Components call the API with a
// root-relative path (`/api/v1/...`) so the browser never needs CORS or an absolute origin.
// Those requests are proxied by app/api/v1/[...path]/route.ts — a route handler rather than a
// rewrite, because rewrites are resolved at build time and this origin is only known at
// runtime on Render. See that file for the reasoning.

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits .next/standalone — a self-contained server bundle that the Dockerfile copies
  // without node_modules. Render's native Node runtime ignores this setting.
  output: 'standalone',
};

module.exports = nextConfig;