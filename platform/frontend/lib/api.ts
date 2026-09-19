// API access for the storefront.
//
// Client components call the same-origin path (`/api/v1/...`), which next.config.js rewrites
// to the backend — so the browser never deals with CORS or an absolute origin.
//
// Server components run in Node and cannot use a relative URL, so they need the backend's
// absolute origin. On Render that is BACKEND_ORIGIN (the internal service URL); locally it
// falls back to localhost:4000.

// Render's `fromService`/`fromDatabase` variables and hand-typed hosts alike are sometimes
// given without a scheme (e.g. "api.onrender.com"). `fetch`, CORS origin matching and
// absolute URLs all require one, so a bare host is promoted to https.
export function withScheme(origin: string): string {
  return /^https?:\/\//.test(origin) ? origin : `https://${origin}`;
}

const PUBLIC_PATH = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

function serverOrigin(): string {
  if (process.env.BACKEND_ORIGIN) return withScheme(process.env.BACKEND_ORIGIN).replace(/\/$/, '');
  if (/^https?:\/\//.test(PUBLIC_PATH)) return PUBLIC_PATH.replace(/\/api\/v1\/?$/, '');
  return 'http://localhost:4000';
}

/** Absolute URL usable from a server component. */
export function serverApiUrl(path: string): string {
  return `${serverOrigin()}/api/v1${path}`;
}

/** Same-origin URL usable from a client component (proxied by next.config rewrites). */
export function clientApiUrl(path: string): string {
  return `${PUBLIC_PATH}${path}`;
}

/**
 * Server-side GET that never throws. A storefront page must still render when the API or
 * database is unavailable — callers fall back to their own empty state rather than
 * surfacing a 500 to a shopper.
 */
export async function serverFetch<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(serverApiUrl(path), { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}