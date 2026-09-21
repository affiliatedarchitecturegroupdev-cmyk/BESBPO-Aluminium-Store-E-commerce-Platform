'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin/trade-accounts — approve pending trade accounts. Approval is what unlocks
// TRADE/VOLUME pricing and credit terms, so it is staff-only and the API enforces it
// (POST /trade-accounts/:id/approve, ADMIN-only). A trade account hangs off a Company,
// so the queue shows the company plus its applying team members.
//
// The credit limit is required here on purpose. Approving without a figure leaves
// `TradeAccount.creditLimit` null, and the backend reads a null limit as "no credit facility" —
// a term order is then refused and the buyer is told to settle by card. Staff who mean to grant
// terms must therefore state a ceiling; approving the pricing tier alone is a deliberate choice
// made by leaving the field blank.

type PendingAccount = {
  id: string;
  discountTier: string;
  createdAt: string;
  company: { name: string; registrationNo: string | null; vatNumber: string | null; users: { id: string; name: string; email: string; companyRole: string | null }[] };
};

export default function Page() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PendingAccount[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await apiFetch<PendingAccount[]>('/admin/trade-accounts/pending');
    if (result.ok) setAccounts(result.data);
    else setDenied(true);
  }, []);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    load();
  }, [load, router]);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);

    // Blank means "approve the pricing tier, grant no facility". A value must parse to a
    // non-negative amount, so a typo cannot be silently sent as NaN or dropped from the body.
    const raw = (limits[id] ?? '').trim();
    let creditLimit: number | undefined;
    if (raw !== '') {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setBusyId(null);
        setError('Enter the credit limit as a non-negative number of rands, or leave it blank to grant no credit facility.');
        return;
      }
      creditLimit = parsed;
    }

    const result = await apiFetch(`/trade-accounts/${id}/approve`, {
      method: 'POST',
      body: creditLimit === undefined ? {} : { creditLimit },
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    load();
  }

  if (denied) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#B03A32' }}>This area is for Aluminium Store staff.</p></main>;
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Trade Account Applications</h1>
      {error && <p style={{ fontSize: 13, color: '#B03A32', marginTop: 16 }}>{error}</p>}

      {accounts === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading applications…</p>
      ) : accounts.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>No applications awaiting approval.</p>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accounts.map((a) => (
            <div key={a.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1B2733', margin: 0 }}>{a.company.name}</p>
                <p style={{ fontSize: 12, color: '#A9B2BD', margin: '5px 0 0' }}>
                  {a.company.registrationNo ? `Reg ${a.company.registrationNo}` : 'No registration number'}
                  {a.company.vatNumber ? ` · VAT ${a.company.vatNumber}` : ''}
                  {' · '}applied {new Date(a.createdAt).toLocaleDateString('en-ZA')}
                </p>
                <p style={{ fontSize: 12, color: '#5C6773', margin: '8px 0 0' }}>
                  {a.company.users.map((u) => `${u.name} <${u.email}>`).join(', ')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Credit limit (R)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="none"
                    value={limits[a.id] ?? ''}
                    onChange={(e) => setLimits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <button onClick={() => approve(a.id)} disabled={busyId === a.id} style={approveButtonStyle}>
                  {busyId === a.id ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 20, maxWidth: 620 }}>
        A limit is what makes trade terms usable. Leaving it blank approves the account for
        TRADE pricing only — the buyer settles by card, EFT or a buy-now-pay-later option, and
        any attempt to order on terms is refused.
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 960, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const rowStyle: React.CSSProperties = { display: 'flex', gap: 16, border: '1px solid #EAE6DC', borderRadius: 12, padding: '16px 18px', background: '#fff' };
const approveButtonStyle: React.CSSProperties = { padding: '9px 20px', background: '#1B2733', color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13, height: 38 };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 };
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#5C6773', textTransform: 'uppercase', letterSpacing: '.06em' };
const inputStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid #A9B2BD', borderRadius: 8, fontSize: 13, width: 150 };