'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken } from '@/lib/session';

// Route: /login — six sign-in options: Email + Google, Facebook, X, Apple, Microsoft.
// OAuth buttons link to the backend's initiate routes, which redirect to each provider's
// consent screen — see docs/18-authentication-sso.md. The same-origin path (/api/v1/...)
// is proxied by next.config.js so the browser never deals with CORS.
const OAUTH_PROVIDERS = [
  { key: 'google', label: 'Continue with Google' },
  { key: 'facebook', label: 'Continue with Facebook' },
  { key: 'x', label: 'Continue with X' },
  { key: 'apple', label: 'Continue with Apple' },
  { key: 'microsoft', label: 'Continue with Microsoft' },
] as const;

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setToken(result.data.accessToken);
    router.push('/account');
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733' }}>Sign In</h1>
      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 6 }}>Six ways in — no provider is the default.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input type="password" required minLength={8} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        {error && <p style={{ fontSize: 12.5, color: '#B03A32', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ padding: 12, background: '#1B2733', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Signing in…' : 'Sign In with Email'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#EAE6DC' }} />
        <span style={{ fontSize: 11, color: '#A9B2BD' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: '#EAE6DC' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OAUTH_PROVIDERS.map((p) => (
          <a key={p.key} href={`/api/v1/auth/${p.key}`} style={oauthButtonStyle}>{p.label}</a>
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 24, textAlign: 'center' }}>
        New here? <a href="/register" style={{ color: '#3E6E91' }}>Create an account</a>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = { padding: 12, border: '1px solid #A9B2BD', borderRadius: 8 };
const oauthButtonStyle: React.CSSProperties = {
  padding: 12, border: '1px solid #A9B2BD', borderRadius: 8, textAlign: 'center',
  textDecoration: 'none', color: '#1B2733', fontSize: 13.5, fontWeight: 500,
};