import { NextRequest, NextResponse } from 'next/server';

// Runtime proxy from the storefront to the backend API.
//
// This deliberately replaces a `rewrites()` entry in next.config.js. Next.js evaluates
// `rewrites()` at build time — the destination is baked into the route manifest — so on Render
// the build would not see BACKEND_ORIGIN and would freeze `http://localhost:4000` as the target,
// sending every browser API call nowhere. A route handler reads the environment on each request,
// so the deploy platform's service URL is picked up without a rebuild.

// Render passes service hosts as `host:port` (or a bare host) without a scheme. `fetch` needs
// one, so promote it.
function backendOrigin(): string {
  const configured = process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return (/^https?:\/\//.test(configured) ? configured : `https://${configured}`).replace(/\/$/, '');
  }
  return 'http://localhost:4000';
}

// The rewrite this replaces matched every method, so the proxy must too.
async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const target = new URL(`/api/v1/${params.path.join('/')}`, backendOrigin());
  target.search = req.nextUrl.search;

  // The shopper's JWT lives in localStorage and travels as a bearer header, so it must be
  // forwarded explicitly — dropping it would silently turn authenticated calls into anonymous
  // ones. `host`/`connection` are hop-by-hop and must not be relayed.
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  // Response headers are relayed so Content-Type survives (client code parses JSON), and
  // Set-Cookie is passed through for the OAuth callback flow.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };