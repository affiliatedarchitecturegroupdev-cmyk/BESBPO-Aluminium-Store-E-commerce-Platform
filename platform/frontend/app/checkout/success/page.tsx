'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/session';

// Route: /checkout/success — post-checkout confirmation. The order number comes from the
// query string the checkout page navigates with; the order itself is re-read from the API so
// the summary is the server's record, not whatever the previous page had in memory.
// Fulfilment timing language follows docs/08-checkout-fulfilment.md: stock and made-to-order
// lead-time bands are stated up front, CMI-routed work is confirmed after partner assignment.

type Order = {
  orderNumber: string;
  status: string;
  fulfilmentPath: string;
  subtotal: string;
  vatAmount: string;
  deliveryFee: string;
  fragileSurcharge: string;
  discountAmount: string;
  total: string;
  paymentMethod: string;
  items: { id: string; quantity: number; unitPrice: string; nonReturnable: boolean; product: { name: string; sku: string } }[];
};

function leadTime(fulfilmentPath: string): string {
  if (fulfilmentPath === 'MADE_TO_ORDER') {
    return 'Made to order — a longer lead-time band applies. This is confirmed by email once production is scheduled.';
  }
  if (fulfilmentPath === 'CMI_PARTNER_NETWORK') {
    return 'Fulfilment time will be confirmed once a partner is assigned.';
  }
  return 'Stock item — standard lead time applies.';
}

function SuccessInner() {
  const params = useSearchParams();
  const orderNumber = params.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setError('No order reference was supplied.');
      return;
    }
    let cancelled = false;
    apiFetch<Order>(`/orders/number/${encodeURIComponent(orderNumber)}`).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOrder(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (error) {
    return (
      <main style={pageStyle}>
        <h1 style={headingStyle}>Order Confirmation</h1>
        <p style={{ fontSize: 13.5, color: '#B03A32' }}>{error}</p>
        <a href="/account/orders" style={{ color: '#3E6E91', fontSize: 13 }}>View your orders</a>
      </main>
    );
  }

  if (!order) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#A9B2BD' }}>Loading your order…</p></main>;
  }

  const rows: [string, string][] = [
    ['Subtotal (excl. VAT)', `R${Number(order.subtotal).toFixed(2)}`],
    ['Delivery', `R${Number(order.deliveryFee).toFixed(2)}`],
    ['Fragile handling', `R${Number(order.fragileSurcharge).toFixed(2)}`],
  ];
  if (Number(order.discountAmount) > 0) rows.push(['Discount', `−R${Number(order.discountAmount).toFixed(2)}`]);
  rows.push(['VAT (15%)', `R${Number(order.vatAmount).toFixed(2)}`]);

  return (
    <main style={pageStyle}>
      <p style={eyebrowStyle}>ORDER CONFIRMED</p>
      <h1 style={headingStyle}>Thank you — {order.orderNumber}</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 12 }}>
        Status: <strong>{order.status.replace(/_/g, ' ')}</strong> · Payment: {order.paymentMethod.replace(/_/g, ' ')}
      </p>
      <p style={{ fontSize: 13, color: '#3E6E91', marginTop: 6 }}>{leadTime(order.fulfilmentPath)}</p>

      <section style={{ ...sectionStyle, marginTop: 28 }}>
        <h2 style={sectionHeadingStyle}>Items</h2>
        {order.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '5px 0' }}>
            <span style={{ color: '#5C6773' }}>
              {item.product.name} × {item.quantity}
              {item.nonReturnable && <em style={{ color: '#A9B2BD' }}> — made to your specification, non-returnable</em>}
            </span>
            <span style={{ fontWeight: 600 }}>R{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </section>

      <section style={{ ...sectionStyle, marginTop: 16, maxWidth: 420 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '4px 0' }}>
            <span style={{ color: '#5C6773' }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '1px solid #EAE6DC', marginTop: 8, paddingTop: 10 }}>
          <span>Total</span>
          <span>R{Number(order.total).toFixed(2)}</span>
        </div>
      </section>

      <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
        <a href="/account/orders" style={primaryCtaStyle}>View my orders</a>
        <a href="/catalogue" style={secondaryCtaStyle}>Continue shopping</a>
      </div>
    </main>
  );
}

// useSearchParams requires a Suspense boundary during static prerender.
export default function Page() {
  return (
    <Suspense fallback={<main style={pageStyle} />}>
      <SuccessInner />
    </Suspense>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const eyebrowStyle: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', letterSpacing: '.1em', margin: 0 };
const sectionStyle: React.CSSProperties = { border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' };
const sectionHeadingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, color: '#1B2733', margin: '0 0 12px' };
const primaryCtaStyle: React.CSSProperties = {
  padding: '13px 28px', background: '#C08A4E', color: '#fff', borderRadius: 999, textDecoration: 'none', fontWeight: 600,
};
const secondaryCtaStyle: React.CSSProperties = {
  padding: '13px 28px', background: 'transparent', color: '#1B2733', border: '1.5px solid #1B2733',
  borderRadius: 999, textDecoration: 'none', fontWeight: 600,
};