'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /business/team — OWNER-only team management. Reads GET /business-desk/team and
// invites via POST /business-desk/team/invite; both are enforced server-side by
// CompanyRoleGuard, so this page reports the refusal a non-OWNER receives rather than trying
// to hide the UI (a client-side role check is not a security boundary).

type Member = { id: string; name: string; email: string; companyRole: string | null; createdAt: string };

export default function Page() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [noCompany, setNoCompany] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('BUYER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<Member[]>('/business-desk/team');
    if (result.ok) {
      setMembers(result.data);
      return;
    }
    if (result.status === 404) setNoCompany(true);
    else setDenied(true);
  }, []);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    load();
  }, [load, router]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await apiFetch('/business-desk/team/invite', { method: 'POST', body: { email, name, role } });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEmail('');
    setName('');
    setRole('BUYER');
    load();
  }

  async function remove(memberId: string) {
    setError(null);
    const result = await apiFetch(`/business-desk/team/${memberId}/remove`, { method: 'POST' });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    load();
  }

  if (noCompany) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#5C6773' }}>This account is not linked to a company.</p></main>;
  }
  if (denied) {
    return (
      <main style={pageStyle}>
        <h1 style={headingStyle}>Team</h1>
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 12 }}>
          Only the company account owner can manage team members. Ask your owner for access.
        </p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Team</h1>
      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 6 }}>OWNER, BUYER, and VIEWER roles — see docs/20-business-desk.md.</p>

      <form onSubmit={invite} style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
        <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, minWidth: 160 }} />
        <input required type="email" placeholder="colleague@company.co.za" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
          <option value="BUYER">Buyer</option>
          <option value="VIEWER">Viewer</option>
          <option value="OWNER">Owner</option>
        </select>
        <button type="submit" disabled={busy} style={{ padding: '10px 22px', background: '#C08A4E', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Inviting…' : 'Invite'}
        </button>
      </form>
      {error && <p style={{ fontSize: 13, color: '#B03A32', marginTop: 12 }}>{error}</p>}

      {members === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading team…</p>
      ) : (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m) => (
            <div key={m.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13.5, color: '#1B2733', margin: 0 }}>{m.name}</p>
                <p style={{ fontSize: 12, color: '#A9B2BD', margin: '4px 0 0' }}>{m.email}</p>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91' }}>{m.companyRole ?? '—'}</span>
              <button onClick={() => remove(m.id)} style={{ background: 'none', border: 'none', color: '#B03A32', fontSize: 12.5, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 800, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733', margin: 0 };
const inputStyle: React.CSSProperties = { padding: 10, border: '1px solid #A9B2BD', borderRadius: 8 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #EAE6DC', borderRadius: 12, padding: '13px 18px', background: '#fff' };