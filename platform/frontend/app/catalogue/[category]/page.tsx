import Link from 'next/link';
import { serverFetch } from '../../../lib/api';
import ProductCard from '../../../components/ProductCard';
import type { Category, ProductList, SubCategory } from '../../../lib/catalog-types';

// Route: /catalogue/[category] — one of the 7 categories. A category page is a SKU browser
// (fast, filterable, grid of cards); the configurator only appears once a sub-category is
// chosen, avoiding a 2,147-row grid for a first-time buyer (docs/02-storefront-ux-ia.md).
export default async function Page({ params }: { params: { category: string } }) {
  const category = await serverFetch<Category & { subCategories: SubCategory[] }>(
    `/catalog/categories/${params.category}`,
  );
  const products = await serverFetch<ProductList>(
    `/catalog/products?category=${params.category}&take=48&sort=name`,
  );

  if (!category) {
    return (
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1B2733' }}>Category not found</h1>
        <p style={{ color: '#5C6773', marginTop: 10 }}>
          We could not load this category. <Link href="/catalogue" style={{ color: '#3E6E91' }}>Back to the catalogue</Link>.
        </p>
      </main>
    );
  }

  const items = products?.items ?? [];

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 24px' }}>
      <nav style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD' }}>
        <Link href="/" style={{ color: '#3E6E91' }}>Home</Link> /{' '}
        <Link href="/catalogue" style={{ color: '#3E6E91' }}>Catalogue</Link> / {category.name}
      </nav>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 10 }}>{category.name}</h1>
      {category.description && (
        <p style={{ fontSize: 14, color: '#5C6773', marginTop: 10, maxWidth: 640 }}>{category.description}</p>
      )}

      {category.subCategories?.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD', letterSpacing: '.08em' }}>SUB-CATEGORIES</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {category.subCategories.map((s) => (
              <Link key={s.slug} href={`/catalogue/${category.slug}/${s.slug}`} style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 12.5, textDecoration: 'none',
                background: '#fff', color: '#1B2733', border: '1px solid #EAE6DC',
              }}>{s.name}</Link>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 28 }}>
        {products ? `${products.total} product${products.total === 1 ? '' : 's'}` : 'Products unavailable'}
      </p>

      {items.length === 0 ? (
        <p style={{ marginTop: 16, color: '#5C6773' }}>No products in this category yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18, marginTop: 16 }}>
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  );
}