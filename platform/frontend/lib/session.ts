'use client';

// Client-side session store. The backend issues a JWT as `accessToken` and the browser keeps it
// in localStorage — there is no cookie/session round-trip yet, so these helpers are the single
// place that reads or writes it. Server components cannot use localStorage; anything that must
// work while signed-out uses the plain serverFetch path in lib/api.ts instead.

const TOKEN_KEY = 'als_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isSignedIn(): boolean {
  return getToken() !== null;
}

/** Absolute API origin for client calls that need an Authorization header. */
function apiOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
  if (/^https?:\/\//.test(base)) return base;
  // Same-origin relative path: keep it relative so the Next.js rewrite proxies the request
  // and CORS never enters the picture (next.config.js).
  return base;
}

/**
 * Authenticated JSON fetch. Returns a discriminated result rather than throwing, so callers
 * render an error state instead of blowing up a client component.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${apiOrigin()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = Array.isArray(parsed?.message) ? parsed.message.join(', ') : parsed?.message;
      return { ok: false, status: res.status, message: message ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, status: 0, message: 'Could not reach the store right now.' };
  }
}