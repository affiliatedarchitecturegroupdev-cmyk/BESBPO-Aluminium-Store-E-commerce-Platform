'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /checkout — steps 2–4 of docs/08-checkout-fulfilment.md: delivery province, payment
// method, then order confirmation.
//
// Totals shown here are indicative. The order is created by POST /orders/checkout, which
// recomputes VAT, delivery and the fragile surcharge server-side from the cart — the browser
// never sends a price, and a tampered client cannot change what is charged.
const PROVINCES = [
  'GAUTENG',
  'KWAZULU_NATAL',
  'WESTERN_CAPE',
  'EASTERN_CAPE',
  'LIMPOPO',
  'MPUMALANGA',
  'NORTH_WEST',
] as const;

const PAYMENT_METHODS = [
  { key: 'PAYFAST', label: 'PayFast (card, Instant EFT, SnapScan)' },
  { key: 'LULAPAY_BNPL', label: 'LulaPay — buy now, pay later' },
  { key: 'PAYJUSTNOW', label: 'PayJustNow — 3 interest-free instalments' },
  { key: 'EFT', label: 'Direct EFT (order held until funds reflect)' },
  { key: 'TRADE_ACCOUNT_TERMS', label: 'Trade account — on approved terms' },
] as const;

type CartItem = { id: string; quantity: number; unitPrice: string; product: { name: string; sku: string } };
type Cart = { items: CartItem[]; subtotal: number };

export default function Page() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [province, setProvince] = useState<string>('GAUTENG');
  const [paymentMethod, setPaymentMethod] = useState<string>('PAYFAST');
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Cart>('/cart').then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setCart(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const placeOrder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      const result = await apiFetch<{ orderNumber: string }>('/orders/checkout', {
        method: 'POST',
        body: {
          paymentMethod,
          deliveryProvince: province,
          couponCode: couponCode.trim() || undefined,
        },
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/checkout/success?order=${encodeURIComponent(result.data.orderNumber)}`);
    },
    [couponCode, paymentMethod, province, router],
  );

  if (loading) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#A9B2BD' }}>Loading checkout…</p></main>;
  }

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <main style={pageStyle}>
        <h1 style={headingStyle}>Checkout</h1>
        <p style={{ fontSize: 13.5, color: '#5C6773' }}>
          Your cart is empty. <a href="/catalogue" style={{ color: '#3E6E91' }}>Browse the catalogue</a>.
        </p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Checkout</h1>

      <form onSubmit={placeOrder} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Order summary</h2>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '4px 0' }}>
              <span style={{ color: '#5C6773' }}>{item.product.name} × {item.quantity}</span>
              <span style={{ fontWeight: 600 }}>R{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginTop: 10, borderTop: '1px solid #EAE6DC', paddingTop: 10 }}>
            <span style={{ color: '#5C6773' }}>Subtotal (excl. VAT)</span>
            <span style={{ fontWeight: 600 }}>R{(cart?.subtotal ?? 0).toFixed(2)}</span>
          </div>
          <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 8 }}>
            Delivery, the fragile-handling surcharge and 15% VAT are added when the order is placed.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Delivery</h2>
          <label style={labelStyle}>
            Delivery province
            <select value={province} onChange={(e) => setProvince(e.target.value)} style={inputStyle}>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          {/* Street-level address capture is Phase 2 — deliveryAddressId is optional on the DTO,
              so an order can be placed now and the address captured by staff at dispatch. */}
          <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 8 }}>
            {/* TODO(phase-2): street-level delivery address entry, persisted to Address and sent
                as deliveryAddressId (docs/08-checkout-fulfilment.md). */}
            Street-address capture is not yet enabled — we&apos;ll confirm it with you before dispatch.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Payment method</h2>
          {PAYMENT_METHODS.map((m) => (
            <label key={m.key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, padding: '6px 0' }}>
              <input type="radio" name="paymentMethod" value={m.key} checked={paymentMethod === m.key} onChange={() => setPaymentMethod(m.key)} />
              {m.label}
            </label>
          ))}
          {/* TODO(phase-2): redirect to the chosen gateway's hosted payment page and let its
              webhook call POST /orders/:id/confirm-payment. Until then orders are created PENDING
              and a staff member confirms payment (docs/11-payments.md). */}
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Coupon</h2>
          <input
            placeholder="Coupon code (optional)" value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)} style={inputStyle}
          />
        </section>

        {error && <p style={{ fontSize: 13, color: '#B03A32', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={busy} style={submitStyle}>
          {busy ? 'Placing order…' : 'Place Order'}
        </button>
      </form>
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733' };
const sectionStyle: React.CSSProperties = { border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' };
const sectionHeadingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, color: '#1B2733', margin: '0 0 12px' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#5C6773' };
const inputStyle: React.CSSProperties = { padding: 10, border: '1px solid #A9B2BD', borderRadius: 8 };
const submitStyle: React.CSSProperties = {
  padding: '14px 28px', background: '#C08A4E', color: '#fff', border: 'none', borderRadius: 999,
  fontWeight: 600, cursor: 'pointer', fontSize: 15,
};