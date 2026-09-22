import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '../../../components/ProductCard';
import { serverFetch } from '../../../lib/api';
import type { CollectionSummary } from '../../../lib/merchandising-types';

// Route: /collections/[slug] — the full list behind a homepage Collection row.
//
// The homepage shows a handful of representative tiles per collection and links here for the
// rest; without this route that "View all N" link would 404. `serverFetch` returns null on a
// non-2xx, and an unknown slug calls `notFound()` so the response is a real 404 rather than a
// 200 carrying a "not found" message — search engines must not index a soft 404.
export default async function Page({ params }: { params: { slug: string } }) {
  const collection = await serverFetch<CollectionSummary>(`/collections/${params.slug}`);
  if (!collection) notFound();

  const accent = collection.accentHex ?? collection.finish?.hex ?? '#3E6E91';

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 24px' }}>
      <nav style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD' }}>
        <Link href="/" style={{ color: '#3E6E91' }}>Home</Link> /{' '}
        <Link href="/catalogue" style={{ color: '#3E6E91' }}>Catalogue</Link> / {collection.title}
      </nav>

      {collection.season && (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: accent, marginTop: 14 }}>
          {collection.season}
        </p>
      )}
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 8 }}>{collection.title}</h1>
      {collection.description && (
        <p style={{ fontSize: 14, color: '#5C6773', marginTop: 10, maxWidth: 680, lineHeight: 1.7 }}>{collection.description}</p>
      )}

      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 24 }}>
        {collection.items.length} product{collection.items.length === 1 ? '' : 's'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18, marginTop: 16 }}>
        {collection.items.map((item) => (
          <div key={item.id}>
            <ProductCard product={item.product} />
            {/* The curator's reason for including this line — the same note the homepage row shows. */}
            {item.note && <p style={{ fontSize: 12, color: '#5C6773', marginTop: 8, lineHeight: 1.5 }}>{item.note}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
