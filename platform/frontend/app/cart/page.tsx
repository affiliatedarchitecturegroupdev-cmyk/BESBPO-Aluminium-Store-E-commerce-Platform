'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /cart — real data from GET /api/v1/cart. Coupon preview comes from the cart endpoint
// itself (`?coupon=`), which delegates the percentage/fixed/free-shipping maths to the
// promotions module rather than this page re-implementing it (docs/31-marketing-engine.md).
//
// "Request a Quote" converts the current cart into a Quote/QuoteItem set instead of checking
// out — for buyers who want a formal RFQ against their cart contents rather than an immediate
// purchase (docs/07-trade-accounts-quotes.md).

type CartItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  configSnapshot: {
    widthMm?: number;
    heightMm?: number;
    pricingBasis?: string;
  } | null;
  product: { sku: string; name: string; configuration: string | null };
};

type Cart = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  coupon: { couponId: string; type: string; discountAmount: number; freeShipping: boolean } | null;
};

export default function Page() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (code?: string) => {
      const result = await apiFetch<Cart>(`/cart${code ? `?coupon=${encodeURIComponent(code)}` : ''}`);
      setLoading(false);
      if (!result.ok) {
        if (result.status === 401) router.push('/login');
        return;
      }
      setCart(result.data);
      if (code) {
        if (result.data.coupon) {
          setCouponError(null);
        } else {
          setCouponError('That coupon could not be applied.');
        }
      }
    },
    [router],
  );

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    load();
  }, [load, router]);

  async function setQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    const result = await apiFetch(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
    if (result.ok) load();
  }

  async function remove(itemId: string) {
    const result = await apiFetch(`/cart/items/${itemId}`, { method: 'DELETE' });
    if (result.ok) load(couponCode || undefined);
  }

  async function applyCoupon() {
    setCouponError(null);
    await load(couponCode);
  }

  async function requestQuoteFromCart() {
    setQuoteMessage(null);
    const result = await apiFetch<{ quoteNumber: string }>('/quotes/from-cart', { method: 'POST' });
    if (!result.ok) {
      setCouponError(result.message);
      return;
    }
    setQuoteMessage(`Quote ${result.data.quoteNumber} submitted — we'll be in touch with pricing.`);
  }

  if (loading) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#A9B2BD' }}>Loading your cart…</p></main>;
  }

  const items = cart?.items ?? [];
  const discount = cart?.coupon?.discountAmount ?? 0;

  return (
    <main style={pageStyle}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733' }}>Your Cart</h1>

      {items.length === 0 ? (
        <div style={{ marginTop: 24, border: '1px solid #EAE6DC', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13.5, color: '#5C6773', margin: 0 }}>
            Your cart is empty. <a href="/catalogue" style={{ color: '#3E6E91' }}>Browse the catalogue</a>.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <a href={`/product/${item.product.sku}`} style={{ fontSize: 14, fontWeight: 600, color: '#1B2733', textDecoration: 'none' }}>
                  {item.product.name}
                </a>
                <p style={{ fontSize: 12, color: '#A9B2BD', margin: '4px 0 0' }}>
                  {item.product.sku}
                  {item.configSnapshot?.widthMm ? ` · ${item.configSnapshot.widthMm}×${item.configSnapshot.heightMm}mm` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setQuantity(item.id, item.quantity - 1)} style={qtyButtonStyle}>−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13.5 }}>{item.quantity}</span>
                <button onClick={() => setQuantity(item.id, item.quantity + 1)} style={qtyButtonStyle}>+</button>
              </div>
              <div style={{ minWidth: 110, textAlign: 'right', fontSize: 13.5, fontWeight: 600 }}>
                R{(Number(item.unitPrice) * item.quantity).toFixed(2)}
              </div>
              <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', color: '#B03A32', fontSize: 12.5, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, maxWidth: 380 }}>
            <input
              placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
              style={{ flex: 1, padding: 10, border: '1px solid #A9B2BD', borderRadius: 8 }}
            />
            <button onClick={applyCoupon} style={applyButtonStyle}>Apply</button>
          </div>
          {cart?.coupon && (
            <p style={{ fontSize: 12.5, color: '#3E6E91', marginTop: 8 }}>
              Discount applied: R{discount.toFixed(2)}
              {cart.coupon.freeShipping ? ' · free delivery' : ''}
            </p>
          )}
          {couponError && <p style={{ fontSize: 12.5, color: '#B03A32', marginTop: 8 }}>{couponError}</p>}

          <div style={{ marginTop: 24, borderTop: '1px solid #EAE6DC', paddingTop: 16, maxWidth: 380 }}>
            <TotalLine label="Subtotal" value={cart?.subtotal ?? 0} />
            {discount > 0 && <TotalLine label="Discount" value={-discount} />}
            <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 8 }}>
              Delivery and VAT are calculated at checkout.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <a href="/checkout" style={primaryCtaStyle}>Proceed to Checkout</a>
            <button onClick={requestQuoteFromCart} style={secondaryCtaStyle}>Request a Quote Instead</button>
          </div>
          {quoteMessage && <p style={{ fontSize: 12.5, color: '#3E6E91', marginTop: 12 }}>{quoteMessage}</p>}
        </>
      )}
    </main>
  );
}

function TotalLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '4px 0' }}>
      <span style={{ color: '#5C6773' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>R{value.toFixed(2)}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #EAE6DC',
  borderRadius: 12, padding: '14px 18px', background: '#fff',
};
const qtyButtonStyle: React.CSSProperties = {
  width: 28, height: 28, border: '1px solid #A9B2BD', borderRadius: 6,
  background: 'transparent', cursor: 'pointer',
};
const applyButtonStyle: React.CSSProperties = {
  padding: '10px 18px', background: '#1B2733', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
};
const primaryCtaStyle: React.CSSProperties = {
  padding: '13px 28px', background: '#C08A4E', color: '#fff', borderRadius: 999, textDecoration: 'none', fontWeight: 600,
};
const secondaryCtaStyle: React.CSSProperties = {
  padding: '13px 28px', background: 'transparent', color: '#1B2733', border: '1.5px solid #1B2733',
  borderRadius: 999, fontWeight: 600, cursor: 'pointer',
};