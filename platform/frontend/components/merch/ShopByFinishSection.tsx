'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FinishSwatch } from '../../lib/merchandising-types';
import { SectionHeading, SectionEmpty, sectionStyle } from './shared';
import { colors, fonts } from '../../tokens';

// §3 Shop by Finish — a colour picker, not a product grid.
//
// The finish is the decision a buyer actually makes first on an aluminium line, so this section
// is a row of real swatches. Selecting one reveals the products behind it inline, so the shopper
// can see a colour leads somewhere without leaving the homepage — and a swatch whose count is
// zero is visibly disabled rather than clicking through to an empty catalogue view.
//
// `description` comes from the finish record (its coating standard), not from marketing copy, so
// it stays accurate.
export default function ShopByFinishSection({ finishes }: { finishes: FinishSwatch[] }) {
  const [selected, setSelected] = useState<FinishSwatch | null>(null);

  if (finishes.length === 0) {
    return (
      <section id="shop-by-finish" style={sectionStyle}>
        <SectionHeading eyebrow="Colour and coating" title="Shop by Finish" />
        <SectionEmpty
          message="No finishes are configured yet."
          hint="Finishes come from the catalogue import — check the seed has run."
        />
      </section>
    );
  }

  return (
    <section id="shop-by-finish" style={sectionStyle}>
      <SectionHeading
        eyebrow="Colour and coating"
        title="Shop by Finish"
        subtitle="Anodised or powder-coated, with the coating standard each finish carries."
        basis="Counts update as the catalogue changes"
      />

      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {finishes.map((f) => {
          const disabled = f.productCount === 0;
          const isSelected = selected?.id === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(isSelected ? null : f)}
              aria-pressed={isSelected}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                background: isSelected ? '#fff' : '#FBFAF7',
                border: `1px solid ${isSelected ? colors.brass : '#EAE6DC'}`,
                borderRadius: 12,
                padding: '12px 16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                minWidth: 244,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: f.hex,
                  border: '1px solid rgba(0,0,0,0.12)',
                  flex: '0 0 auto',
                }}
              />
              <span>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: colors.slate }}>{f.name}</span>
                <span style={{ display: 'block', fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver, marginTop: 3 }}>
                  {f.productCount} {f.productCount === 1 ? 'product' : 'products'}
                  {f.qualicoat ? ' · Qualicoat' : ''}
                  {f.qualanod ? ' · Qualanod' : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ marginTop: 22, background: '#fff', border: '1px solid #EAE6DC', borderRadius: 14, padding: 22 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#5C6773' }}>
            {selected.description ?? selected.name}
          </p>
          <Link
            href={`/catalogue?finish=${selected.id}`}
            style={{
              display: 'inline-block',
              marginTop: 14,
              fontFamily: fonts.display,
              fontWeight: 600,
              fontSize: 13.5,
              color: '#fff',
              background: colors.slate,
              padding: '10px 18px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            View all {selected.productCount} in {selected.name} →
          </Link>
        </div>
      )}
    </section>
  );
}
