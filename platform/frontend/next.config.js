/** @type {import('next').NextConfig} */

// A Render service host variable arrives as a bare host ("api.onrender.com"), which is not a
// usable fetch/rewrite destination on its own. Promote it to https.
const withScheme = (origin) => (/^https?:\/\//.test(origin) ? origin : `https://${origin}`);

// The backend API is a separate service (NestJS) on Render. Several components call the
// API with a root-relative path (`/api/v1/...`) so the browser never needs CORS or an
// absolute origin. Those requests are proxied here to the real backend origin.
//
// Precedence:
//   1. BACKEND_ORIGIN  — server-side proxy target (Render internal URL or public host)
//   2. NEXT_PUBLIC_API_URL — if it is a root-relative path (e.g. "/api/v1"), nothing to do
//   3. fall back to localhost:4000 for local dev
const backendOrigin = (() => {
  if (process.env.BACKEND_ORIGIN) return withScheme(process.env.BACKEND_ORIGIN).replace(/\/$/, '');
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub && /^https?:\/\//.test(pub)) return pub.replace(/\/api\/v1\/?$/, '');
  return 'http://localhost:4000';
})();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;