'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /business/credit — read-only credit position from GET /business-desk/credit. Limit
// changes go through admin review, so there is no self-service control here; a buyer seeing
// their position is the point, changing it is not.

type Credit = { creditLimit: number | null; creditUsed: number; available: number | null };

export default function Page() {
  const router = useRouter();
  const [credit, setCredit] = useState<Credit | null>(null);
  const [noCompany, setNoCompany] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Credit>('/business-desk/credit').then((result) => {
      if (cancelled) return;
      if (result.ok) setCredit(result.data);
      else if (result.status === 404) setNoCompany(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (noCompany) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#5C6773' }}>This account is not linked to a company.</p></main>;
  }

  const utilisation = credit?.creditLimit && credit.creditLimit > 0 ? (credit.creditUsed / credit.creditLimit) * 100 : null;

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Credit Position</h1>
      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 6 }}>Limit changes go through admin review, not self-service.</p>

      {credit === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading credit position…</p>
      ) : credit.creditLimit === null ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24, maxWidth: 520 }}>
          No credit facility is set on this account. Orders are settled by card, EFT or a
          buy-now-pay-later option at checkout.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginTop: 24 }}>
            <Metric label="Credit limit" value={`R${credit.creditLimit.toFixed(2)}`} />
            <Metric label="Used" value={`R${credit.creditUsed.toFixed(2)}`} />
            <Metric label="Available" value={credit.available !== null ? `R${credit.available.toFixed(2)}` : '—'} />
          </div>

          {utilisation !== null && (
            <div style={{ marginTop: 28, maxWidth: 420 }}>
              <div style={{ height: 6, background: '#EAE6DC', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(utilisation, 100)}%`, height: '100%', background: utilisation > 85 ? '#B03A32' : '#C08A4E' }} />
              </div>
              <p style={{ fontSize: 12, color: '#5C6773', marginTop: 8 }}>{utilisation.toFixed(1)}% of limit used</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' }}>
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11.5, color: '#A9B2BD', marginTop: 4 }}>{label}</p>
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 700, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733', margin: 0 };