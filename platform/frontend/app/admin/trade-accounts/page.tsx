'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin/trade-accounts — approve pending trade accounts. Approval is what unlocks
// TRADE/VOLUME pricing and credit terms, so it is staff-only and the API enforces it
// (POST /trade-accounts/:id/approve, ADMIN-only). A trade account hangs off a Company,
// so the queue shows the company plus its applying team members.

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
    const result = await apiFetch(`/trade-accounts/${id}/approve`, { method: 'POST' });
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
              <button onClick={() => approve(a.id)} disabled={busyId === a.id} style={approveButtonStyle}>
                {busyId === a.id ? 'Approving…' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 960, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const rowStyle: React.CSSProperties = { display: 'flex', gap: 16, border: '1px solid #EAE6DC', borderRadius: 12, padding: '16px 18px', background: '#fff' };
const approveButtonStyle: React.CSSProperties = { padding: '9px 20px', background: '#1B2733', color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13 };