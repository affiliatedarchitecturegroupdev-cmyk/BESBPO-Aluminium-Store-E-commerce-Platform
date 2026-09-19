'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /business/quotes — company-wide RFQs from GET /business-desk/quotes. A quote is a
// pre-price-freeze RFQ answered by a human, so this page reports status rather than letting a
// buyer edit the quote (docs/07-trade-accounts-quotes.md).

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  projectName: string | null;
  notes: string | null;
  createdAt: string;
  items: { id: string; description: string }[];
};

export default function Page() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [noCompany, setNoCompany] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Quote[]>('/business-desk/quotes').then((result) => {
      if (cancelled) return;
      if (result.ok) setQuotes(result.data);
      else if (result.status === 404) setNoCompany(true);
      else setQuotes([]);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (noCompany) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#5C6773' }}>This account is not linked to a company.</p></main>;
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Company Quotes</h1>

      {quotes === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>
          No quotes yet. You can request a quote from your <a href="/cart" style={{ color: '#3E6E91' }}>cart</a>.
        </p>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {quotes.map((q) => (
            <div key={q.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: '#1B2733', margin: 0 }}>{q.quoteNumber}</p>
                <p style={{ fontSize: 12, color: '#A9B2BD', margin: '5px 0 0' }}>
                  {q.projectName ?? 'Unnamed project'} · {q.items.length} line{q.items.length === 1 ? '' : 's'} ·{' '}
                  {new Date(q.createdAt).toLocaleDateString('en-ZA')}
                </p>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91' }}>{q.status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733', margin: 0 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #EAE6DC', borderRadius: 12, padding: '14px 18px', background: '#fff' };