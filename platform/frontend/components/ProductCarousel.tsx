'use client';

import { useRef } from 'react';
import Link from 'next/link';

export type CarouselProduct = {
  sku: string;
  name: string;
  priceLabel: string;
  originalPriceLabel?: string; // shown struck-through for Clearance
  badge?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  products: CarouselProduct[];
  anchorId?: string;
};

// One reusable carousel powers Trending, Recent Arrivals, and Clearance Sale — same
// interaction pattern, different data and optional badge/strike-through pricing.
// Real product data comes from GET /api/v1/catalog with the relevant sort/filter
// (trending = order-frequency, recent = createdAt desc, clearance = active promotions) —
// illustrative props here until wired to that endpoint.
export default function ProductCarousel({ title, subtitle, products, anchorId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollBy(dx: number) {
    scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  }

  return (
    <section id={anchorId} style={{ padding: '56px 32px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, color: '#1B2733', margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 6 }}>{subtitle}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => scrollBy(-320)} aria-label="Scroll left" style={arrowStyle}>←</button>
          <button onClick={() => scrollBy(320)} aria-label="Scroll right" style={arrowStyle}>→</button>
        </div>
      </div>

      <div ref={scrollRef} style={{ display: 'flex', gap: 18, overflowX: 'auto', marginTop: 22, paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
        {products.map((p) => (
          <Link
            key={p.sku}
            href={`/product/${p.sku}`}
            style={{
              flex: '0 0 260px', scrollSnapAlign: 'start', background: '#fff',
              border: '1px solid #EAE6DC', borderRadius: 14, padding: 18, textDecoration: 'none', color: '#1B2733',
            }}
          >
            {p.badge && (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, background: '#C08A4E', color: '#fff', padding: '3px 8px', borderRadius: 999 }}>
                {p.badge}
              </span>
            )}
            <div style={{ height: 140, background: '#F5F3EE', borderRadius: 10, marginTop: 12 }} />
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91', marginTop: 12 }}>{p.sku}</p>
            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{p.name}</p>
            <p style={{ marginTop: 8 }}>
              {p.originalPriceLabel && (
                <span style={{ fontSize: 12.5, color: '#A9B2BD', textDecoration: 'line-through', marginRight: 8 }}>{p.originalPriceLabel}</span>
              )}
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16 }}>{p.priceLabel}</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

const arrowStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', border: '1px solid #EAE6DC', background: '#fff', cursor: 'pointer',
};
