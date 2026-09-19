'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /account/trade — trade account status and application. Reads the trade account off
// GET /auth/me and applies via POST /trade-accounts/apply. A trade application is reviewed by
// staff before the TRADE/VOLUME pricing tier is granted (docs/07-trade-accounts-quotes.md), so
// a submitted application shows as pending rather than immediately unlocking pricing.

type Profile = {
  company: {
    name: string;
    tradeAccount: { approved: boolean; discountTier: string; creditLimit: string | null; creditUsed: string } | null;
  } | null;
};

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ companyName: '', registrationNo: '', vatNumber: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Profile>('/auth/me').then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setProfile(result.data);
        // Pre-fill from the company already on file so the applicant is not retyping it.
        if (result.data.company) setForm((f) => ({ ...f, companyName: result.data.company!.name }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await apiFetch('/trade-accounts/apply', {
      method: 'POST',
      body: {
        companyName: form.companyName,
        registrationNo: form.registrationNo || undefined,
        vatNumber: form.vatNumber || undefined,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage('Application received. Our trade desk reviews applications and will contact you.');
    const refreshed = await apiFetch<Profile>('/auth/me');
    if (refreshed.ok) setProfile(refreshed.data);
  }

  const trade = profile?.company?.tradeAccount ?? null;

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Trade Account</h1>

      {trade && (
        <section style={{ ...cardStyle, marginTop: 24, maxWidth: 480 }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', margin: 0 }}>
            {trade.approved ? 'APPROVED' : 'PENDING REVIEW'}
          </p>
          <p style={{ fontSize: 13.5, color: '#1B2733', margin: '10px 0 0' }}>
            Pricing tier: <strong>{trade.discountTier}</strong>
          </p>
          {trade.approved && trade.creditLimit && (
            <p style={{ fontSize: 13, color: '#5C6773', margin: '6px 0 0' }}>
              Credit limit R{Number(trade.creditLimit).toFixed(2)} · used R{Number(trade.creditUsed).toFixed(2)}
            </p>
          )}
        </section>
      )}

      {!trade?.approved && (
        <>
          <p style={{ fontSize: 14, color: '#5C6773', marginTop: 28, maxWidth: 560, lineHeight: 1.7 }}>
            Trade accounts unlock trade and volume pricing, credit terms, and quote-based ordering.
            Applications are reviewed by our trade desk.
          </p>
          <form onSubmit={apply} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
            <input required placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} style={inputStyle} />
            <input placeholder="Company registration number (optional)" value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} style={inputStyle} />
            <input placeholder="VAT number (optional)" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} style={inputStyle} />
            {error && <p style={{ fontSize: 13, color: '#B03A32', margin: 0 }}>{error}</p>}
            {message && <p style={{ fontSize: 13, color: '#3E6E91', margin: 0 }}>{message}</p>}
            <button type="submit" disabled={busy} style={{ padding: '13px 28px', background: '#C08A4E', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Submitting…' : 'Submit Trade Application'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const cardStyle: React.CSSProperties = { border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' };
const inputStyle: React.CSSProperties = { padding: 12, border: '1px solid #A9B2BD', borderRadius: 8 };