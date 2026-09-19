import Link from 'next/link';
import { serverFetch } from '../../../../lib/api';
import ProductCard from '../../../../components/ProductCard';
import type { ProductList, SubCategory } from '../../../../lib/catalog-types';

// Route: /catalogue/[category]/[subcategory] — one of the 31 sub-categories, and the entry
// point into the configurator: choosing a sub-category narrows the product set enough that
// a per-SKU configuration is meaningful (docs/02-storefront-ux-ia.md, docs/03-configurator-spec.md).
export default async function Page({ params }: { params: { category: string; subcategory: string } }) {
  const subCategory = await serverFetch<SubCategory & { category: { name: string; slug: string } }>(
    `/catalog/subcategories/${params.subcategory}`,
  );
  const products = await serverFetch<ProductList>(
    `/catalog/products?subCategory=${params.subcategory}&take=48&sort=name`,
  );

  if (!subCategory) {
    return (
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1B2733' }}>Sub-category not found</h1>
        <p style={{ color: '#5C6773', marginTop: 10 }}>
          <Link href={`/catalogue/${params.category}`} style={{ color: '#3E6E91' }}>Back to {params.category}</Link>
        </p>
      </main>
    );
  }

  const items = products?.items ?? [];

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 24px' }}>
      <nav style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD' }}>
        <Link href="/" style={{ color: '#3E6E91' }}>Home</Link> /{' '}
        <Link href="/catalogue" style={{ color: '#3E6E91' }}>Catalogue</Link> /{' '}
        <Link href={`/catalogue/${params.category}`} style={{ color: '#3E6E91' }}>{params.category}</Link> /{' '}
        {subCategory.name}
      </nav>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 10 }}>{subCategory.name}</h1>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD', marginTop: 8 }}>
        PRICING BASIS: {subCategory.pricingBasis}
      </p>

      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 24 }}>
        {products ? `${products.total} product${products.total === 1 ? '' : 's'}` : 'Products unavailable'}
      </p>

      {items.length === 0 ? (
        <p style={{ marginTop: 16, color: '#5C6773' }}>No products in this sub-category yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18, marginTop: 16 }}>
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  );
}