import Link from 'next/link';
import type { FeaturedPick } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, SectionEmpty, sectionStyle, ProductVisual, primaryImage } from './shared';
import { colors, fonts } from '../../tokens';

// §7 Featured Products (Editor's Picks) — a magazine layout, hero plus a column.
//
// The whole point of including Featured *alongside* Best Sellers and Trending is editorial: these
// are the lines a merchandiser wants to put in front of a buyer for a reason that is not volume
// or interest. So the curator's note is rendered as the primary text of each card, and it is
// attributed — a store that says "we recommend this, and here is why" reads differently from one
// that says "popular". The note is never generated; it is the human's sentence.
//
// The hero is the one pick flagged isHero. The database enforces at most one live hero, so this
// layout can rely on the section rendering one lead card.
export default function FeaturedProductsSection({ picks }: { picks: FeaturedPick[] }) {
  if (picks.length === 0) {
    return (
      <section id="featured" style={sectionStyle}>
        <SectionHeading eyebrow="Curated by our team" title="Editor's Picks" />
        <SectionEmpty message="No picks have been published yet." hint="The merchandising desk curates this section." />
      </section>
    );
  }

  const hero = picks.find((p) => p.isHero) ?? null;
  const rest = picks.filter((p) => p !== hero);

  return (
    <section id="featured" style={sectionStyle}>
      <SectionHeading
        eyebrow="Curated by our team"
        title="Editor's Picks"
        subtitle="Lines we recommend for a stated reason — not because they are the most popular."
        basis={hero?.curator ? `Curated by ${hero.curator}` : undefined}
      />

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: 20, alignItems: 'stretch' }}>
        {hero && (
          <Link
            href={`/product/${hero.product.sku}`}
            style={{
              background: '#fff',
              border: '1px solid #EAE6DC',
              borderRadius: 16,
              padding: 26,
              textDecoration: 'none',
              color: colors.slate,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontFamily: fonts.mono, fontSize: 10, background: colors.brass, color: '#fff', padding: '3px 8px', borderRadius: 999, alignSelf: 'flex-start' }}>
              EDITOR&apos;S PICK
            </span>
            <ProductVisual imageUrl={primaryImage(hero.product)} height={230} />
            <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, marginTop: 16 }}>{hero.product.sku}</p>
            <p style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 600, margin: '6px 0 0' }}>{hero.product.name}</p>
            <p style={{ fontSize: 14, color: '#5C6773', marginTop: 10, lineHeight: 1.55 }}>{hero.note}</p>
            <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 18, marginTop: 'auto', paddingTop: 16 }}>
              {formatRand(hero.product.retailPrice)}
            </p>
          </Link>
        )}

        {rest.length > 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            {rest.map((pick) => (
              <Link
                key={pick.id}
                href={`/product/${pick.product.sku}`}
                style={{
                  background: '#fff',
                  border: '1px solid #EAE6DC',
                  borderRadius: 14,
                  padding: 18,
                  textDecoration: 'none',
                  color: colors.slate,
                  display: 'grid',
                  gridTemplateColumns: '1fr 88px',
                  gap: 16,
                }}
              >
                <div>
                  <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, margin: 0 }}>{pick.product.sku}</p>
                  <p style={{ fontSize: 14.5, fontWeight: 600, margin: '4px 0 0' }}>{pick.product.name}</p>
                  <p style={{ fontSize: 13, color: '#5C6773', marginTop: 8, lineHeight: 1.5 }}>{pick.note}</p>
                  <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, marginTop: 10, marginBottom: 0 }}>
                    {formatRand(pick.product.retailPrice)}
                  </p>
                </div>
                <div style={{ background: colors.pane, borderRadius: 8, overflow: 'hidden', height: 88 }}>
                  {primaryImage(pick.product) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryImage(pick.product) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
