import Link from 'next/link';
import type { CollectionSummary } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, SectionEmpty, sectionStyle, primaryImage } from './shared';
import { colors, fonts } from '../../tokens';

// §8 Seasonal / Thematic Collections — themed rows with the collection's own colour.
//
// A collection is a story a merchandiser tells ("Coastal Specification 2026"), so each one gets
// its own accent colour and its own rationale paragraph rather than being flattened into another
// product grid. `season` is shown where set, so a seasonal collection is obvious as one.
//
// Each row shows a count and a handful of representative tiles rather than all items: the
// homepage is a browse surface, and the full list belongs on the collection page the row links to.
export default function CollectionsSection({ collections }: { collections: CollectionSummary[] }) {
  if (collections.length === 0) {
    return (
      <section id="collections" style={sectionStyle}>
        <SectionHeading eyebrow="Seasonal & thematic" title="Collections" />
        <SectionEmpty message="No collections are published yet." hint="Collections are grouped by the merchandising desk." />
      </section>
    );
  }

  return (
    <section id="collections" style={sectionStyle}>
      <SectionHeading
        eyebrow="Seasonal & thematic"
        title="Collections"
        subtitle="Curated groupings for a specification, a season, or a job stage."
      />

      <div style={{ marginTop: 24, display: 'grid', gap: 20 }}>
        {collections.map((c) => {
          const accent = c.accentHex ?? c.finish?.hex ?? colors.glass;
          return (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #EAE6DC', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                <div>
                  {c.season && (
                    <span style={{ fontFamily: fonts.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: accent }}>
                      {c.season}
                    </span>
                  )}
                  <h3 style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, margin: '6px 0 0', color: colors.slate }}>
                    {c.title}
                  </h3>
                  {c.description && <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8, maxWidth: 720 }}>{c.description}</p>}
                </div>
                <Link
                  href={`/collections/${c.slug}`}
                  style={{
                    flex: '0 0 auto',
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#fff',
                    background: accent,
                    padding: '9px 16px',
                    borderRadius: 999,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  View all {c._count.items} →
                </Link>
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {c.items.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={`/product/${item.product.sku}`}
                    style={{
                      flex: '0 0 180px',
                      border: '1px solid #EAE6DC',
                      borderRadius: 12,
                      padding: 12,
                      textDecoration: 'none',
                      color: colors.slate,
                    }}
                  >
                    <div style={{ height: 92, background: colors.pane, borderRadius: 8, overflow: 'hidden' }}>
                      {primaryImage(item.product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={primaryImage(item.product) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                    </div>
                    <p style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.glass, marginTop: 10 }}>{item.product.sku}</p>
                    <p style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{item.product.name}</p>
                    <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 13.5, marginTop: 6, marginBottom: 0 }}>
                      {formatRand(item.product.retailPrice)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
