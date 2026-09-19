import Link from 'next/link';
import type { Category } from '../lib/catalog-types';

// Fallback only — the 7-category breakdown reused from the corporate site (windowpane-grid
// icon family). Live data comes from GET /api/v1/catalog/categories; this list renders when
// the catalogue is empty or the API is unreachable so the homepage never shows a blank grid.
const FALLBACK: Pick<Category, 'slug' | 'name' | '_count'>[] = [
  { slug: 'windows', name: 'Windows', _count: { subCategories: 0 } },
  { slug: 'doors', name: 'Doors', _count: { subCategories: 0 } },
  { slug: 'facade-structural-systems', name: 'Facade & Structural', _count: { subCategories: 0 } },
  { slug: 'outdoor-living-shading', name: 'Outdoor Living', _count: { subCategories: 0 } },
  { slug: 'railing-screening-systems', name: 'Railing & Screening', _count: { subCategories: 0 } },
  { slug: 'roofing-glazing-garage-doors', name: 'Roofing Glazing', _count: { subCategories: 0 } },
  { slug: 'raw-material-hardware', name: 'Raw Material', _count: { subCategories: 0 } },
];

export default function CategoryGrid({ categories }: { categories?: Category[] }) {
  const items = categories && categories.length > 0 ? categories : FALLBACK;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 20,
      }}
    >
      {items.map((c) => (
        <Link
          key={c.slug}
          href={`/catalogue/${c.slug}`}
          style={{
            display: 'block',
            background: '#fff',
            border: '1px solid #EAE6DC',
            borderRadius: 14,
            padding: 24,
            textDecoration: 'none',
            color: '#1B2733',
          }}
        >
          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', margin: 0 }}>{c.name}</h4>
          {c._count && c._count.subCategories > 0 ? (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#C08A4E', marginTop: 6 }}>
              {c._count.subCategories} sub-categories
            </p>
          ) : (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#C08A4E', marginTop: 6 }}>
              Browse range
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
