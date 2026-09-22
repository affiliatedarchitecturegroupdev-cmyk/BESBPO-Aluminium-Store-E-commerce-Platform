'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BudgetShop, BudgetTier } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, SectionEmpty, sectionStyle, primaryImage } from './shared';
import { apiGet } from '../../lib/session';
import { colors, fonts } from '../../tokens';

// §9 Budget Shop — price-band tabs.
//
// The bands are bands, not typographic precision: the server reports them as approximate and the
// section says so, because a "R5,000–R15,000" tab that silently excluded a R5,000.01 line would
// be a small lie. Tabs show their counts so an empty band is visible before it is clicked.
//
// Selecting a tab re-queries the server rather than filtering a partial list that was shipped to
// the browser, so the count on the tab and the products shown always come from the same place.
export default function BudgetShopSection({ initial }: { initial: BudgetShop }) {
  const [shop, setShop] = useState<BudgetShop>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectTier(tier: BudgetTier) {
    if (tier.key === shop.activeTier || loading) return;
    setLoading(true);
    setError(null);
    const res = await apiGet<BudgetShop>(`/catalog/budget-shop?tier=${encodeURIComponent(tier.key)}`);
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setShop(res.data);
  }

  if (shop.tiers.length === 0) {
    return (
      <section id="budget-shop" style={sectionStyle}>
        <SectionHeading eyebrow="Shop by price" title="Budget Shop" />
        <SectionEmpty message="Price bands are unavailable right now." hint="The catalogue API did not return any bands." />
      </section>
    );
  }

  const activeTier = shop.tiers.find((t) => t.key === shop.activeTier);

  return (
    <section id="budget-shop" style={sectionStyle}>
      <SectionHeading
        eyebrow="Shop by price"
        title="Budget Shop"
        subtitle={activeTier?.blurb ?? 'Pick a price band to see what falls inside it.'}
        basis={shop.approximate ? shop.approximationNote : undefined}
      />

      <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 10 }} role="tablist" aria-label="Price bands">
        {shop.tiers.map((t) => {
          const isActive = t.key === shop.activeTier;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTier(t)}
              style={{
                fontFamily: fonts.display,
                fontSize: 13.5,
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${isActive ? colors.slate : '#EAE6DC'}`,
                background: isActive ? colors.slate : '#fff',
                color: isActive ? '#fff' : colors.slate,
                cursor: 'pointer',
              }}
            >
              {t.label}
              <span style={{ fontFamily: fonts.mono, fontSize: 10.5, marginLeft: 8, opacity: 0.75 }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 13, color: '#9C3B35', marginTop: 14 }}>{error}</p>}

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, opacity: loading ? 0.55 : 1 }}>
        {shop.items.map((p) => (
          <Link
            key={p.sku}
            href={`/product/${p.sku}`}
            style={{ background: '#fff', border: '1px solid #EAE6DC', borderRadius: 14, padding: 16, textDecoration: 'none', color: colors.slate }}
          >
            <div style={{ height: 120, background: colors.pane, borderRadius: 8, overflow: 'hidden' }}>
              {primaryImage(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage(p) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>
            <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, marginTop: 12 }}>{p.sku}</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{p.name}</p>
            <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 15.5, marginTop: 8, marginBottom: 0 }}>
              {formatRand(p.retailPrice)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
