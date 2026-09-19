'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /account/orders — the buyer's own order history from GET /orders/mine. The API scopes
// this to the caller, so no client-side filtering by user is needed (docs/08-checkout-fulfilment.md).

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  fulfilmentPath: string;
  total: string;
  createdAt: string;
  items: { id: string; quantity: number; product: { name: string; sku: string } }[];
};

export default function Page() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Order[]>('/orders/mine').then((result) => {
      if (cancelled) return;
      if (result.ok) setOrders(result.data);
      else setOrders([]);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Your Orders</h1>

      {orders === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>
          No orders yet. <a href="/catalogue" style={{ color: '#3E6E91' }}>Browse the catalogue</a>.
        </p>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((o) => (
            <a key={o.id} href={`/checkout/success?order=${encodeURIComponent(o.orderNumber)}`} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#1B2733', margin: 0 }}>{o.orderNumber}</p>
                <p style={{ fontSize: 12, color: '#A9B2BD', margin: '5px 0 0' }}>
                  {new Date(o.createdAt).toLocaleDateString('en-ZA')} · {o.items.length} line{o.items.length === 1 ? '' : 's'}
                  {o.fulfilmentPath === 'MADE_TO_ORDER' ? ' · made to order' : ''}
                </p>
              </div>
              <span style={statusStyle}>{o.status.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 100, textAlign: 'right' }}>R{Number(o.total).toFixed(2)}</span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #EAE6DC', borderRadius: 12,
  padding: '14px 18px', background: '#fff', textDecoration: 'none',
};
const statusStyle: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91', letterSpacing: '.06em' };