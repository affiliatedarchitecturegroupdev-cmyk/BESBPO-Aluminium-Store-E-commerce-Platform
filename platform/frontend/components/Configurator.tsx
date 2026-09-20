'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// The platform's centrepiece interaction — see docs/03-configurator-spec.md.
// Calls POST /api/v1/configurator/validate-size then /api/v1/configurator/price
// on every change, mirroring the formulas verified in the Pricing Framework workbook.

type Finish = { id: string; name: string; hex: string };
type GlazingPackage = { id: string; name: string; upgradeRateM2: number };

type Props = {
  productId: string;
  sku: string;
  maxWidthMm: number;
  maxHeightMm: number;
  finishes: Finish[];
  glazingPackages: GlazingPackage[];
  discountTier?: 'RETAIL' | 'TRADE' | 'VOLUME';
};

type PriceResult = {
  baseCost: number;
  markupPct: number;
  retail: number;
  trade: number;
  volume: number;
};

export default function Configurator({
  productId,
  sku,
  maxWidthMm,
  maxHeightMm,
  finishes,
  glazingPackages,
  discountTier = 'RETAIL',
}: Props) {
  const [widthMm, setWidthMm] = useState(Math.min(1209, maxWidthMm));
  const [heightMm, setHeightMm] = useState(Math.min(1209, maxHeightMm));
  const [finishId, setFinishId] = useState(finishes[0]?.id ?? '');
  const [glazingId, setGlazingId] = useState(glazingPackages[0]?.id ?? '');
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [sizeValid, setSizeValid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const router = useRouter();

  const selectedFinish = useMemo(
    () => finishes.find((f) => f.id === finishId),
    [finishes, finishId],
  );

  // Re-validate size and re-price whenever any configurator input changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const validateRes = await fetch('/api/v1/configurator/validate-size', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, widthMm, heightMm, finishId, glazingPackageId: glazingId }),
        });
        const validation = await validateRes.json();
        if (cancelled) return;
        setSizeValid(validation.valid);

        if (!validation.valid) {
          setPrice(null);
          return;
        }

        const priceRes = await fetch('/api/v1/configurator/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            widthMm,
            heightMm,
            finishId,
            glazingPackageId: glazingId,
            discountTier,
          }),
        });
        if (!priceRes.ok) throw new Error('Pricing service unavailable');
        const result: PriceResult = await priceRes.json();
        if (!cancelled) setPrice(result);
      } catch (e) {
        if (!cancelled) setError('Could not price this configuration — try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [productId, widthMm, heightMm, finishId, glazingId, discountTier]);

  const displayPrice =
    price && (discountTier === 'TRADE' ? price.trade : discountTier === 'VOLUME' ? price.volume : price.retail);

  // The cart recomputes the price server-side from the same inputs, so the configuration — not
  // a client-supplied price — is what travels. Signed-out shoppers are sent to sign in first,
  // because the cart is per-account.
  async function onAddToCart() {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    setAdding(true);
    setAddError(null);
    // The tier is not sent: the server derives it from the account (TRADE/VOLUME/RETAIL), so a
    // client cannot choose its own discount band.
    const result = await apiFetch('/cart/items', {
      method: 'POST',
      body: {
        productId,
        quantity: 1,
        widthMm,
        heightMm,
        finishId,
        glazingPackageId: glazingId,
      },
    });
    setAdding(false);
    if (!result.ok) {
      setAddError(result.status === 401 ? 'Please sign in to add to cart.' : result.message);
      return;
    }
    router.push('/cart');
  }

  return (
    <div style={{ border: '1.5px solid #A9B2BD', borderRadius: 14, padding: 24, maxWidth: 480 }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#3E6E91' }}>{sku}</p>

      <label style={{ display: 'block', marginTop: 16 }}>
        Width (mm) — max {maxWidthMm}
        <input
          type="range"
          min={300}
          max={maxWidthMm}
          step={1}
          value={widthMm}
          onChange={(e) => setWidthMm(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <span>{widthMm}mm</span>
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        Height (mm) — max {maxHeightMm}
        <input
          type="range"
          min={300}
          max={maxHeightMm}
          step={1}
          value={heightMm}
          onChange={(e) => setHeightMm(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <span>{heightMm}mm</span>
      </label>

      <fieldset style={{ marginTop: 16, border: 'none', padding: 0 }}>
        <legend>Finish</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {finishes.map((f) => (
            <button
              key={f.id}
              onClick={() => setFinishId(f.id)}
              aria-pressed={finishId === f.id}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: f.hex,
                border: finishId === f.id ? '3px solid #C08A4E' : '1px solid #A9B2BD',
                cursor: 'pointer',
              }}
              title={f.name}
            />
          ))}
        </div>
        {selectedFinish && <p style={{ fontSize: 12, color: '#5C6773' }}>{selectedFinish.name}</p>}
      </fieldset>

      <fieldset style={{ marginTop: 16, border: 'none', padding: 0 }}>
        <legend>Glazing package</legend>
        <select value={glazingId} onChange={(e) => setGlazingId(e.target.value)} style={{ width: '100%', padding: 8 }}>
          {glazingPackages.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} {g.upgradeRateM2 > 0 ? `(+R${g.upgradeRateM2}/m²)` : ''}
            </option>
          ))}
        </select>
      </fieldset>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #EAE6DC' }}>
        {!sizeValid && (
          <p style={{ color: '#9C6B35' }}>
            This size is outside the AAAMSA-tested range for this configuration.{' '}
            <a href="/quote/new">Request a custom quote instead →</a>
          </p>
        )}
        {sizeValid && loading && <p>Pricing…</p>}
        {sizeValid && error && <p style={{ color: '#B03A32' }}>{error}</p>}
        {sizeValid && !loading && !error && displayPrice != null && (
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 700 }}>
            R {displayPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            <span style={{ fontSize: 12, color: '#5C6773', fontFamily: 'IBM Plex Mono, monospace', marginLeft: 8 }}>
              {discountTier}
            </span>
          </p>
        )}

        {addError && <p style={{ color: '#B03A32', fontSize: 12.5 }}>{addError}</p>}

        <button
          type="button"
          onClick={onAddToCart}
          disabled={!sizeValid || loading || displayPrice == null || adding}
          style={{
            width: '100%',
            marginTop: 12,
            padding: 12,
            background: sizeValid && displayPrice != null ? '#1B2733' : '#A9B2BD',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: !sizeValid || displayPrice == null || adding ? 'default' : 'pointer',
          }}
        >
          {adding ? 'Adding…' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
