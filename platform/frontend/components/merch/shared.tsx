import { colors, fonts } from '../../tokens';

// Shared chrome for the ten merchandising sections (docs/37-merchandising-sections.md).
//
// Each section keeps its own distinct layout and interaction — that is the point of the spec —
// but they share the heading block, the empty state, and the product tile so the storefront
// reads as one page rather than ten unrelated widgets.

export const sectionStyle: React.CSSProperties = {
  padding: '56px 32px',
  maxWidth: 1240,
  margin: '0 auto',
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  basis,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** What the section is actually based on — shown so a ranking never looks arbitrary. */
  basis?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
      <div>
        {eyebrow && (
          <p style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.brass, margin: 0 }}>
            {eyebrow}
          </p>
        )}
        <h2 style={{ fontFamily: fonts.display, fontSize: 24, color: colors.slate, margin: eyebrow ? '6px 0 0' : 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 6, maxWidth: 620 }}>{subtitle}</p>}
      </div>
      {basis && (
        <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver, textAlign: 'right', maxWidth: 260, margin: 0 }}>{basis}</p>
      )}
    </div>
  );
}

/**
 * The empty state. Every section renders one rather than being silently omitted, so a shopper
 * (and a merchandiser checking a deploy) can tell the difference between "nothing to show yet"
 * and "the section is broken" — which is exactly the ambiguity that made Clearance look broken.
 */
export function SectionEmpty({ message, hint }: { message: string; hint?: string }) {
  return (
    <div
      style={{
        marginTop: 22,
        border: '1px dashed #D9D3C6',
        borderRadius: 14,
        padding: '28px 24px',
        background: '#FBFAF7',
      }}
    >
      <p style={{ fontSize: 14, color: '#5C6773', margin: 0 }}>{message}</p>
      {hint && <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.silver, marginTop: 8, marginBottom: 0 }}>{hint}</p>}
    </div>
  );
}

/** The placeholder panel every product tile uses — no invented photography. */
export function ProductThumb({ height = 140 }: { height?: number }) {
  return <div style={{ height, background: colors.pane, borderRadius: 10, marginTop: 12 }} />;
}

/** Renders one product's image when the catalogue carries one, the placeholder panel otherwise. */
export function ProductVisual({
  imageUrl,
  height = 140,
  fit = 'cover',
}: {
  imageUrl?: string | null;
  height?: number;
  fit?: 'cover' | 'contain';
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        style={{ width: '100%', height, objectFit: fit, borderRadius: 10, marginTop: 12, background: colors.pane }}
      />
    );
  }
  return <ProductThumb height={height} />;
}

/** Two-decimal Rand, same as `formatRand` — re-exported so sections import one place. */
export { formatRand } from '../../lib/catalog-types';

/** The first (lowest sortOrder) image of a product, if it has any. */
export function primaryImage(product: { images?: { url: string }[] }): string | null {
  return product.images?.[0]?.url ?? null;
}
