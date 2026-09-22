import Link from 'next/link';
import type { BestSellerProduct } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, SectionEmpty, sectionStyle, ProductVisual, primaryImage } from './shared';
import { colors, fonts } from '../../tokens';

// §1 Best Sellers — a ranked leaderboard, not another product row.
//
// The distinction from Trending is real and worth showing: Trending is what people are pricing up
// recently, Best Sellers is what has actually sold. So this section is deliberately numbered and
// ordered by volume, and each row states the units behind its rank — a shopper (and a B2B buyer in
// particular) can see *why* a line is at the top rather than being asked to trust a badge.
//
// Renders its own empty state rather than disappearing: a young order book with no sales yet is a
// normal state, and a merchandiser checking a deploy needs to tell that apart from a broken query.
export default function BestSellersSection({ products }: { products: BestSellerProduct[] }) {
  return (
    <section id="best-sellers" style={sectionStyle}>
      <SectionHeading
        eyebrow="Ranked by volume"
        title="Best Sellers"
        subtitle="The lines that have actually shipped the most units — cumulative sales, not recent interest."
        basis="Basis: cumulative units sold across all orders"
      />

      {products.length === 0 ? (
        <SectionEmpty
          message="No sales recorded yet, so there is no best-seller ranking to show."
          hint="This section fills itself from order history as soon as the first orders are placed."
        />
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', display: 'grid', gap: 10 }}>
          {products.map((p, i) => (
            <li key={p.sku}>
              <Link
                href={`/product/${p.sku}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 88px 1fr auto',
                  alignItems: 'center',
                  gap: 18,
                  background: '#fff',
                  border: '1px solid #EAE6DC',
                  borderRadius: 14,
                  padding: '14px 20px',
                  textDecoration: 'none',
                  color: colors.slate,
                }}
              >
                <span style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: i < 3 ? colors.brass : '#D9D3C6' }}>
                  {i + 1}
                </span>
                <div style={{ height: 64, background: colors.pane, borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {primaryImage(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryImage(p) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div>
                  <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, margin: 0 }}>{p.sku}</p>
                  <p style={{ fontSize: 14.5, fontWeight: 600, margin: '4px 0 0' }}>{p.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, margin: 0 }}>{formatRand(p.retailPrice)}</p>
                  <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver, margin: '4px 0 0' }}>
                    {p.unitsSold.toLocaleString('en-ZA')} units sold
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
