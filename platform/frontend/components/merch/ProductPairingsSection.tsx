import Link from 'next/link';
import type { ProductPairing } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, sectionStyle, primaryImage } from './shared';
import { colors, fonts } from '../../tokens';

// §10 Product Pairings ("Complete the Project") — a PDP section, not a homepage one.
//
// Pairings are curated and directional: they answer "what else does this job need", which is the
// question a buyer standing on a product page has. The note on each pairing is what makes it
// worth showing — "the roller set this door is specified with" is useful; a bare grid of other
// hardware is not.
//
// The section returns null when a product has no pairings. Most SKUs have none, and an empty
// "Complete the Project" panel on every one of them would be noise; the curated pairs are the
// exception, and they appear only where they exist.
export default function ProductPairingsSection({ pairings }: { pairings: ProductPairing[] }) {
  if (pairings.length === 0) return null;

  return (
    <section id="pairings" style={{ ...sectionStyle, paddingTop: 8 }}>
      <SectionHeading
        eyebrow="Curated pairing"
        title="Complete the Project"
        subtitle="The parts this product is normally specified with, and why."
      />
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {pairings.map((pair) => (
          <Link
            key={pair.id}
            href={`/product/${pair.target.sku}`}
            style={{ background: '#FBFAF7', border: '1px solid #EAE6DC', borderRadius: 14, padding: 16, textDecoration: 'none', color: colors.slate, display: 'grid', gridTemplateColumns: '1fr 76px', gap: 14 }}
          >
            <div>
              <p style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.glass, margin: 0 }}>{pair.target.sku}</p>
              <p style={{ fontSize: 13.5, fontWeight: 600, margin: '4px 0 0', lineHeight: 1.35 }}>{pair.target.name}</p>
              {pair.note && <p style={{ fontSize: 12.5, color: '#5C6773', marginTop: 8, lineHeight: 1.5 }}>{pair.note}</p>}
              <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 15, marginTop: 10, marginBottom: 0 }}>
                {formatRand(pair.target.retailPrice)}
              </p>
            </div>
            <div style={{ height: 76, background: colors.pane, borderRadius: 8, overflow: 'hidden' }}>
              {primaryImage(pair.target) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage(pair.target) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
