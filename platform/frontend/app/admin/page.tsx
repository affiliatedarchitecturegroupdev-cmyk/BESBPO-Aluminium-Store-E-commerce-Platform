'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin — staff overview. GET /admin/dashboard is ADMIN-only server-side; the
// frontend does not try to enforce roles (a client check is not a security boundary), it
// simply shows the "not permitted" state the API returns to a non-admin session.

type Summary = { orders: number; openQuotes: number; pendingTradeAccounts: number };

export default function Page() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Summary>('/admin/dashboard').then((result) => {
      if (cancelled) return;
      if (result.ok) setSummary(result.data);
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
      <h1 style={headingStyle}>Staff Dashboard</h1>
      {summary === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading…</p>
      ) : (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
          <StatCard label="Orders" value={summary.orders} href="/admin" />
          <StatCard label="Quotes awaiting review" value={summary.openQuotes} href="/admin/quotes" />
          <StatCard label="Trade accounts pending" value={summary.pendingTradeAccounts} href="/admin/trade-accounts" />
        </div>
      )}

      <div style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="/admin/quotes" style={linkStyle}>Quote review</a>
        <a href="/admin/trade-accounts" style={linkStyle}>Trade accounts</a>
        <a href="/admin/cmi-routing" style={linkStyle}>CMI routing</a>
        <a href="/admin/catalogue" style={linkStyle}>Catalogue</a>
        <a href="/admin/compliance-docs" style={linkStyle}>Compliance documents</a>
      </div>
    </main>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} style={{ border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff', textDecoration: 'none', display: 'block' }}>
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12.5, color: '#5C6773', margin: '6px 0 0' }}>{label}</p>
    </a>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 960, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const linkStyle: React.CSSProperties = { fontSize: 13, color: '#3E6E91' };