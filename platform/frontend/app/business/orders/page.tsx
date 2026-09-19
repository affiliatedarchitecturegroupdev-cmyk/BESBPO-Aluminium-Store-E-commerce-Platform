'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /business/orders — every order placed by anyone on the company's team, from
// GET /business-desk/orders. The API scopes this by the caller's company, so ordering across
// the team is safe to display without client-side filtering.

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  user: { name: string };
  items: { id: string; quantity: number }[];
};

export default function Page() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [noCompany, setNoCompany] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Order[]>('/business-desk/orders').then((result) => {
      if (cancelled) return;
      if (result.ok) setOrders(result.data);
      else if (result.status === 404) setNoCompany(true);
      else setOrders([]);
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
      <h1 style={headingStyle}>Company Orders</h1>

      {orders === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>No orders placed yet.</p>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: '#1B2733', margin: 0 }}>{o.orderNumber}</p>
                <p style={{ fontSize: 12, color: '#A9B2BD', margin: '5px 0 0' }}>
                  Placed by {o.user.name} · {new Date(o.createdAt).toLocaleDateString('en-ZA')} · {o.items.length} line{o.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91' }}>{o.status.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 100, textAlign: 'right' }}>R{Number(o.total).toFixed(2)}</span>
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