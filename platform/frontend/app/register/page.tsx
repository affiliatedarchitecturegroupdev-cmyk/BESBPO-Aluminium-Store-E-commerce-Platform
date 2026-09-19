'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken } from '@/lib/session';

// Route: /register — same six options as /login. A buyer who registers with Email and
// later signs in with Google on the same address is linked to one account, not two —
// see AuthService.findOrCreateOAuthUser() and docs/18-authentication-sso.md.
const OAUTH_PROVIDERS = [
  { key: 'google', label: 'Sign up with Google' },
  { key: 'facebook', label: 'Sign up with Facebook' },
  { key: 'x', label: 'Sign up with X' },
  { key: 'apple', label: 'Sign up with Apple' },
  { key: 'microsoft', label: 'Sign up with Microsoft' },
] as const;

export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await apiFetch<{ accessToken: string }>('/auth/register', {
      method: 'POST',
      body: form,
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
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733' }}>Create an Account</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        {/* Backend enforces MinLength(8); mirrored here so the error appears before a round-trip. */}
        <input type="password" required minLength={8} placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} />
        {error && <p style={{ fontSize: 12.5, color: '#B03A32', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ padding: 12, background: '#1B2733', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Creating account…' : 'Create Account with Email'}
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

      <p style={{ fontSize: 11.5, color: '#A9B2BD', marginTop: 20, textAlign: 'center' }}>
        By continuing you accept our <a href="/legal/terms" style={{ color: '#3E6E91' }}>Terms</a> and{' '}
        <a href="/legal/privacy" style={{ color: '#3E6E91' }}>Privacy Policy</a>.
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = { padding: 12, border: '1px solid #A9B2BD', borderRadius: 8 };
const oauthButtonStyle: React.CSSProperties = {
  padding: 12, border: '1px solid #A9B2BD', borderRadius: 8, textAlign: 'center',
  textDecoration: 'none', color: '#1B2733', fontSize: 13.5, fontWeight: 500,
};