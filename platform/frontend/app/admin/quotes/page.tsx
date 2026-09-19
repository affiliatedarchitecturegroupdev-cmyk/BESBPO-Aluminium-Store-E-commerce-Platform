'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin/quotes — RFQ review queue (GET /admin/quotes/needing-review, ADMIN-only).
// This is where a staff member works through submitted quotes; CMI routing suggestions for a
// quote are a staff action too (docs/06-cmi-partner-routing.md, docs/07-trade-accounts-quotes.md).

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  projectName: string | null;
  createdAt: string;
  items: { id: string; description: string; quantity: number }[];
};

export default function Page() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Quote[]>('/admin/quotes/needing-review').then((result) => {
      if (cancelled) return;
      if (result.ok) setQuotes(result.data);
      else setDenied(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (denied) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#B03A32' }}>This area is for Aluminium Store staff.</p></main>;
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Quote Review</h1>
      {quotes === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>No quotes awaiting review.</p>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {quotes.map((q) => (
            <div key={q.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#1B2733', margin: 0 }}>{q.quoteNumber}</p>
                <p style={{ fontSize: 12.5, color: '#5C6773', margin: '5px 0 0' }}>
                  {q.projectName ?? 'Unnamed project'} · {q.items.length} line{q.items.length === 1 ? '' : 's'} ·{' '}
                  {new Date(q.createdAt).toLocaleDateString('en-ZA')}
                </p>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91' }}>
                {q.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 960, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #EAE6DC', borderRadius: 12, padding: '14px 18px', background: '#fff' };