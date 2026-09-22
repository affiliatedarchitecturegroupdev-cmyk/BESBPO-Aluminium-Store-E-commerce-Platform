import Link from 'next/link';
import type { TopRatedProduct } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, SectionEmpty, sectionStyle, ProductVisual, primaryImage } from './shared';
import { colors, fonts } from '../../tokens';

// §2 Top Rated — a spotlight grid with a review quote on each tile.
//
// The review-count threshold is not a detail: without it one 5-star review outranks fifty at 4.8,
// so the count is shown beside every average. The pull-quote on each tile is the newest review
// that actually carries text — a bare rating gives a spotlight nothing to say.
//
// The quote is presented as a customer's words, attributed where a name exists, and never
// summarised into a claim. If a product has a rating but no review text yet, the tile shows the
// rating alone rather than a headline we wrote ourselves.
export default function TopRatedSection({ products }: { products: TopRatedProduct[] }) {
  return (
    <section id="top-rated" style={sectionStyle}>
      <SectionHeading
        eyebrow="Minimum 3 reviews"
        title="Top Rated"
        subtitle="Ranked by average customer rating. Products need at least three reviews to qualify, so one good review cannot carry a line to the top."
        basis="Basis: average review rating, 3-review minimum"
      />

      {products.length === 0 ? (
        <SectionEmpty
          message="No products have reached the three-review minimum yet."
          hint="Ratings appear here as reviews accumulate — the threshold exists to keep the ranking meaningful."
        />
      ) : (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {products.map((p) => (
            <Link
              key={p.sku}
              href={`/product/${p.sku}`}
              style={{
                background: '#fff',
                border: '1px solid #EAE6DC',
                borderRadius: 14,
                padding: 20,
                textDecoration: 'none',
                color: colors.slate,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.brass }}>
                  {p.averageRating.toFixed(1)}
                </span>
                <span aria-hidden style={{ color: colors.brass, fontSize: 13, letterSpacing: 1 }}>
                  {'★'.repeat(Math.round(p.averageRating))}
                  <span style={{ color: '#D9D3C6' }}>{'★'.repeat(5 - Math.round(p.averageRating))}</span>
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver, marginLeft: 'auto' }}>
                  {p.reviewCount} reviews
                </span>
              </div>

              <ProductVisual imageUrl={primaryImage(p)} height={150} />

              <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, marginTop: 14 }}>{p.sku}</p>
              <p style={{ fontSize: 14.5, fontWeight: 600, margin: '4px 0 0' }}>{p.name}</p>
              <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, marginTop: 8 }}>{formatRand(p.retailPrice)}</p>

              {p.topQuote && (
                <blockquote
                  style={{
                    margin: '14px 0 0',
                    paddingLeft: 12,
                    borderLeft: `2px solid ${colors.brass}`,
                    fontSize: 13,
                    color: '#5C6773',
                    fontStyle: 'normal',
                  }}
                >
                  “{p.topQuote}”
                  <footer style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver, marginTop: 6 }}>
                    {p.topQuoteAuthor ?? 'Verified buyer'}
                  </footer>
                </blockquote>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
