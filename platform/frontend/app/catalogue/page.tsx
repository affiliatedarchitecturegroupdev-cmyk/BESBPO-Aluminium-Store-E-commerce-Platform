import Link from 'next/link';
import { serverFetch } from '../../lib/api';
import ProductCard from '../../components/ProductCard';
import type { Category, Finish, ProductList } from '../../lib/catalog-types';

// Route: /catalogue — sector-filterable browse across all 7 categories (docs/02-storefront-ux-ia.md).
// Sector filtering reuses the Segment enum already on Product; a product can carry more than
// one segment (e.g. a security door is both Industrial and Residential) — docs/13-search-filtering.md.

const SECTORS = [
  { slug: 'commercial', name: 'Commercial' },
  { slug: 'industrial', name: 'Industrial' },
  { slug: 'institutional', name: 'Institutional' },
  { slug: 'residential', name: 'Residential' },
];

export default async function Page({ searchParams }: { searchParams: { sector?: string; q?: string; clearance?: string; finish?: string } }) {
  // A clearance view is a distinct query (`/catalog/clearance`) rather than a filter on
  // `/catalog/products`, and it must be reachable as a URL of its own. The homepage hero's
  // "Shop Clearance" CTA points here, so the link survives even when the homepage's own
  // Clearance carousel is hidden because nothing is currently marked down.
  const onClearance = searchParams.clearance === '1';
  // `finish` is passed by the homepage Shop by Finish swatches. Without this branch the link
  // would land on the unfiltered catalogue while the swatch said "View all 517 in Natural
  // Anodised" — the same dangling-filter defect as the clearance CTA.
  const finishId = searchParams.finish;

  const query = new URLSearchParams({ take: '48', sort: 'name' });
  if (searchParams.sector) query.set('segment', searchParams.sector.toUpperCase());
  if (searchParams.q) query.set('search', searchParams.q);
  if (finishId) query.set('finishId', finishId);

  const [categories, products, finishes] = await Promise.all([
    serverFetch<Category[]>('/catalog/categories'),
    onClearance
      ? serverFetch<ProductList>('/catalog/clearance?take=48')
      : serverFetch<ProductList>(`/catalog/products?${query.toString()}`),
    finishId ? serverFetch<Finish[]>('/catalog/finishes') : Promise.resolve(null),
  ]);

  const items = products?.items ?? [];
  // Resolved for the heading only; the filter itself ran server-side on `finishId`.
  const activeFinish = finishId ? (finishes ?? []).find((f) => f.id === finishId) : undefined;

  const heading = onClearance ? 'Clearance' : activeFinish ? activeFinish.name : 'Full Catalogue';

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 24px' }}>
      <nav style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD' }}>
        <Link href="/" style={{ color: '#3E6E91' }}>Home</Link> / Catalogue
      </nav>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 10 }}>
        {heading}
      </h1>
      {onClearance && (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8, maxWidth: 620 }}>
          End-of-line and overstock stock, marked down while it lasts. Clearance pricing is applied at checkout.
        </p>
      )}
      {activeFinish && (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8, maxWidth: 620 }}>
          Products carrying the {activeFinish.name} finish
          {activeFinish.qualicoat ? ' · Qualicoat' : ''}
          {activeFinish.qualanod ? ' · Qualanod' : ''}
        </p>
      )}

      {!onClearance && (
        <form method="get" style={{ marginTop: 20, display: 'flex', gap: 10, maxWidth: 460 }}>
          {/* Carry the active finish through a search submit; without this the form replaces the
              whole query string and silently drops the filter the shopper was just looking at. */}
          {finishId && <input type="hidden" name="finish" value={finishId} />}
          <input name="q" defaultValue={searchParams.q ?? ''} placeholder="Search by name, SKU, or configuration"
            style={{ flex: 1, padding: 10, border: '1px solid #A9B2BD', borderRadius: 8 }} />
          <button type="submit" style={{ padding: '10px 18px', background: '#1B2733', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Search</button>
        </form>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <Link href="/catalogue" style={pill(!onClearance && !finishId && searchParams.sector == null)}>All sectors</Link>
        {SECTORS.map((s) => (
          <Link key={s.slug} href={`/catalogue?sector=${s.slug}`} style={pill(!onClearance && !finishId && searchParams.sector === s.slug)}>{s.name}</Link>
        ))}
        <Link href="/catalogue?clearance=1" style={pill(onClearance)}>Clearance</Link>
        {activeFinish && (
          <span style={{ ...pill(true), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {activeFinish.name}
            <Link href={searchParams.sector ? `/catalogue?sector=${searchParams.sector}` : '/catalogue'} style={{ color: '#fff', textDecoration: 'none' }} aria-label={`Clear the ${activeFinish.name} filter`}>
              ×
            </Link>
          </span>
        )}
      </div>

      {!onClearance && (categories ?? []).length > 0 && (
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
          {onClearance
            ? 'Nothing is on clearance right now. Check back as stock is cycled.'
            : 'Nothing to show yet. Once the Master Product Catalogue is imported this grid populates automatically.'}
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