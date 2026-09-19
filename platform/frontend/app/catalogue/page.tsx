import Link from 'next/link';
import { serverFetch } from '../../lib/api';
import ProductCard from '../../components/ProductCard';
import type { Category, ProductList } from '../../lib/catalog-types';

// Route: /catalogue — sector-filterable browse across all 7 categories (docs/02-storefront-ux-ia.md).
// Sector filtering reuses the Segment enum already on Product; a product can carry more than
// one segment (e.g. a security door is both Industrial and Residential) — docs/13-search-filtering.md.

const SECTORS = [
  { slug: 'commercial', name: 'Commercial' },
  { slug: 'industrial', name: 'Industrial' },
  { slug: 'institutional', name: 'Institutional' },
  { slug: 'residential', name: 'Residential' },
];

export default async function Page({ searchParams }: { searchParams: { sector?: string; q?: string } }) {
  const query = new URLSearchParams({ take: '48', sort: 'name' });
  if (searchParams.sector) query.set('segment', searchParams.sector.toUpperCase());
  if (searchParams.q) query.set('search', searchParams.q);

  const [categories, products] = await Promise.all([
    serverFetch<Category[]>('/catalog/categories'),
    serverFetch<ProductList>(`/catalog/products?${query.toString()}`),
  ]);

  const items = products?.items ?? [];

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 24px' }}>
      <nav style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD' }}>
        <Link href="/" style={{ color: '#3E6E91' }}>Home</Link> / Catalogue
      </nav>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 10 }}>Full Catalogue</h1>

      <form method="get" style={{ marginTop: 20, display: 'flex', gap: 10, maxWidth: 460 }}>
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder="Search by name, SKU, or configuration"
          style={{ flex: 1, padding: 10, border: '1px solid #A9B2BD', borderRadius: 8 }} />
        <button type="submit" style={{ padding: '10px 18px', background: '#1B2733', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Search</button>
      </form>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <Link href="/catalogue" style={pill(searchParams.sector == null)}>All sectors</Link>
        {SECTORS.map((s) => (
          <Link key={s.slug} href={`/catalogue?sector=${s.slug}`} style={pill(searchParams.sector === s.slug)}>{s.name}</Link>
        ))}
      </div>

      {(categories ?? []).length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD', letterSpacing: '.08em' }}>CATEGORIES</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {categories!.map((c) => (
              <Link key={c.slug} href={`/catalogue/${c.slug}`} style={pill(false)}>{c.name}</Link>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 28 }}>
        {products ? `${products.total} product${products.total === 1 ? '' : 's'}` : 'Catalogue unavailable'}
      </p>

      {items.length === 0 ? (
        <p style={{ marginTop: 16, color: '#5C6773' }}>
          Nothing to show yet. Once the Master Product Catalogue is imported this grid populates automatically.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18, marginTop: 16 }}>
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 999, fontSize: 12.5, textDecoration: 'none',
    background: active ? '#1B2733' : '#fff', color: active ? '#fff' : '#1B2733',
    border: '1px solid ' + (active ? '#1B2733' : '#EAE6DC'),
  };
}