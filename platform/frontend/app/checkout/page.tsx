'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';
import { PROVINCES, provinceLabel } from '@/lib/provinces';

// Route: /checkout — steps 2–4 of docs/08-checkout-fulfilment.md: delivery address + zone,
// payment method, then order confirmation.
//
// Totals shown here are indicative. The order is created by POST /orders/checkout, which
// recomputes VAT, delivery and the fragile surcharge server-side from the cart — the browser
// never sends a price, and a tampered client cannot change what is charged.
const PAYMENT_METHODS = [
  { key: 'PAYFAST', label: 'PayFast (card, Instant EFT, SnapScan)' },
  { key: 'LULAPAY_BNPL', label: 'LulaPay — buy now, pay later' },
  { key: 'PAYJUSTNOW', label: 'PayJustNow — 3 interest-free instalments' },
  { key: 'EFT', label: 'Direct EFT (order held until funds reflect)' },
  { key: 'TRADE_ACCOUNT_TERMS', label: 'Trade account — on approved terms' },
] as const;

type CartItem = { id: string; quantity: number; unitPrice: string; product: { name: string; sku: string } };
type Cart = { items: CartItem[]; subtotal: number };
type Address = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

const EMPTY_FORM = { line1: '', line2: '', city: '', province: 'GAUTENG', postalCode: '' };

export default function Page() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
    Promise.all([apiFetch<Cart>('/cart'), apiFetch<Address[]>('/addresses')]).then(
      ([cartResult, addressResult]) => {
        if (cancelled) return;
        setLoading(false);
        if (cartResult.ok) setCart(cartResult.data);
        if (addressResult.ok) {
          setAddresses(addressResult.data);
          const preferred = addressResult.data.find((a) => a.isDefault) ?? addressResult.data[0];
          if (preferred) setSelectedAddressId(preferred.id);
          // No saved address yet — go straight to the form rather than making the buyer
          // discover that checkout is blocked behind a separate page.
          else setShowAddressForm(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [router]);

  const saveAddress = useCallback(async () => {
    setError(null);
    const result = await apiFetch<Address>('/addresses', { method: 'POST', body: form });
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    setAddresses((prev) => [result.data, ...prev.map((a) => ({ ...a, isDefault: false }))]);
    setSelectedAddressId(result.data.id);
    setShowAddressForm(false);
    setForm(EMPTY_FORM);
    return result.data.id;
  }, [form]);

  /** Choosing an existing address supersedes the inline form. */
  const selectAddress = useCallback((id: string) => {
    setSelectedAddressId(id);
    setShowAddressForm(false);
  }, []);

  /** The form and the saved-address list are mutually exclusive: opening the form clears the
   * radio selection, so "use a different address" cannot silently keep the old one. */
  const startNewAddress = useCallback(() => {
    setSelectedAddressId(null);
    setShowAddressForm(true);
  }, []);

  const placeOrder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);

      // The form is the source of truth whenever it is open; otherwise the selected saved address
      // is. Persist a typed address first so the order can reference it and staff have
      // street-level detail at dispatch.
      let addressId = showAddressForm ? null : selectedAddressId;
      if (!addressId) {
        addressId = await saveAddress();
        if (!addressId) {
          setBusy(false);
          return;
        }
      }

      // The province follows the address that will actually be attached, so the quote and the
      // order agree. The backend re-derives it from the saved address regardless.
      const province = addresses.find((a) => a.id === addressId)?.province ?? form.province;

      const result = await apiFetch<{ orderNumber: string }>('/orders/checkout', {
        method: 'POST',
        body: {
          paymentMethod,
          deliveryAddressId: addressId,
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
    [
      addresses,
      couponCode,
      form.province,
      paymentMethod,
      router,
      saveAddress,
      selectedAddressId,
      showAddressForm,
    ],
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
            Delivery, the fragile-handling surcharge and 15% VAT are added when the order is placed
            (step 3 of checkout). The delivery fee comes from the zone for the province above.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Delivery address</h2>

          {addresses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {addresses.map((a) => (
                <label key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
                  <input
                    type="radio"
                    name="deliveryAddress"
                    checked={selectedAddressId === a.id}
                    onChange={() => selectAddress(a.id)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ color: '#5C6773' }}>
                    <strong style={{ color: '#1B2733' }}>{a.line1}</strong>
                    {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {provinceLabel(a.province)} {a.postalCode}
                    {a.isDefault && <em style={{ color: '#A9B2BD' }}> — default</em>}
                  </span>
                </label>
              ))}
            </div>
          )}

          {addresses.length > 0 && !showAddressForm && (
            <button type="button" onClick={startNewAddress} style={linkButtonStyle}>
              + Use a different address
            </button>
          )}

          {showAddressForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: addresses.length ? 14 : 0 }}>
              <label style={labelStyle}>
                Street address
                <input
                  value={form.line1} required
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  placeholder="12 Voortrekker Road" style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Suburb / complex (optional)
                <input
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Unit 4, Kempton Park" style={inputStyle}
                />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ ...labelStyle, flex: 1 }}>
                  City
                  <input
                    value={form.city} required
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Johannesburg" style={inputStyle}
                  />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Postal code
                  <input
                    value={form.postalCode} required inputMode="numeric" pattern="\d{4}"
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="2001" style={inputStyle}
                  />
                </label>
              </div>
              <label style={labelStyle}>
                Province
                <select
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  style={inputStyle}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{provinceLabel(p)}</option>
                  ))}
                </select>
              </label>
              <p style={{ fontSize: 12, color: '#A9B2BD', margin: 0 }}>
                Delivery is priced from the province, so this must match where the aluminium is
                being delivered.
              </p>
            </div>
          )}
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
const linkButtonStyle: React.CSSProperties = {
  marginTop: 12, background: 'none', border: 'none', padding: 0, color: '#3E6E91',
  fontSize: 13, cursor: 'pointer', textAlign: 'left',
};
const submitStyle: React.CSSProperties = {
  padding: '14px 28px', background: '#C08A4E', color: '#fff', border: 'none', borderRadius: 999,
  fontWeight: 600, cursor: 'pointer', fontSize: 15,
};