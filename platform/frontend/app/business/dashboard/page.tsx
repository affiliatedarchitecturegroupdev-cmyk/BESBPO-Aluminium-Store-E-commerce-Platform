'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /business/dashboard — Business Desk home for Trade/Volume companies. Real data from
// GET /business-desk/dashboard (docs/20-business-desk.md). Distinct from /admin, which is
// Aluminium Store staff rather than a customer company.

type Dashboard = {
  discountTier: string;
  creditLimit: string | null;
  creditUsed: string;
  openOrders: number;
  openQuotes: number;
  teamCount: number;
};

export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [noCompany, setNoCompany] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Dashboard>('/business-desk/dashboard').then((result) => {
      if (cancelled) return;
      if (result.ok) setData(result.data);
      else if (result.status === 404) setNoCompany(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (noCompany) {
    return (
      <main style={pageStyle}>
        <p style={eyebrowStyle}>BUSINESS DESK</p>
        <h1 style={headingStyle}>No company on this account</h1>
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 12, maxWidth: 560 }}>
          The Business Desk is for trade and volume accounts. Apply for a trade account to set up
          your company and team.
        </p>
        <a href="/account/trade" style={{ color: '#3E6E91', fontSize: 13 }}>Apply for a trade account →</a>
      </main>
    );
  }

  const metrics: [string, string][] = data
    ? [
        ['Discount tier', data.discountTier],
        ['Open orders', `${data.openOrders}`],
        ['Open quotes', `${data.openQuotes}`],
        ['Team members', `${data.teamCount}`],
      ]
    : [];

  return (
    <main style={pageStyle}>
      <p style={eyebrowStyle}>BUSINESS DESK</p>
      <h1 style={headingStyle}>Dashboard</h1>

      {data === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginTop: 24 }}>
            {metrics.map(([label, value]) => (
              <div key={label} style={cardStyle}>
                <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: 0 }}>{value}</p>
                <p style={{ fontSize: 11.5, color: '#A9B2BD', marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>

          {data.creditLimit && (
            <p style={{ fontSize: 13, color: '#5C6773', marginTop: 20 }}>
              Credit: R{Number(data.creditUsed).toFixed(2)} used of R{Number(data.creditLimit).toFixed(2)}
            </p>
          )}
        </>
      )}

      <nav style={{ display: 'flex', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
        <a href="/business/orders" style={navLinkStyle}>Orders →</a>
        <a href="/business/quotes" style={navLinkStyle}>Quotes →</a>
        <a href="/business/statements" style={navLinkStyle}>Statements →</a>
        <a href="/business/credit" style={navLinkStyle}>Credit →</a>
        <a href="/business/team" style={navLinkStyle}>Team →</a>
      </nav>
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '64px 24px' };
const eyebrowStyle: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', letterSpacing: '.1em', margin: 0 };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: '6px 0 0' };
const cardStyle: React.CSSProperties = { border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' };
const navLinkStyle: React.CSSProperties = { color: '#3E6E91', fontSize: 13.5 };