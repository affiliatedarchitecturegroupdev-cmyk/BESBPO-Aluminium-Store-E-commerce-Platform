import Link from 'next/link';
import Configurator from '../../../components/Configurator';
import { serverFetch } from '../../../lib/api';
import { formatRand, type Finish, type GlazingPackage, type Product } from '../../../lib/catalog-types';

// Route: /product/[sku] — single SKU detail + the live configurator, the platform's
// centrepiece interaction (docs/03-configurator-spec.md). The configurator repriced on
// every change against the FastAPI pricing microservice, whose formulas are cross-verified
// to the cent against the Pricing Framework workbook.
export default async function Page({ params }: { params: { sku: string } }) {
  const [product, finishes, glazingPackages] = await Promise.all([
    serverFetch<Product>(`/catalog/by-sku/${params.sku}`),
    serverFetch<Finish[]>('/catalog/finishes'),
    serverFetch<GlazingPackage[]>('/catalog/glazing-packages'),
  ]);

  if (!product) {
    return (
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1B2733' }}>Product not found</h1>
        <p style={{ color: '#5C6773', marginTop: 10 }}>
          <Link href="/catalogue" style={{ color: '#3E6E91' }}>Back to the catalogue</Link>
        </p>
      </main>
    );
  }

  const finishList = (finishes ?? []).map((f) => ({ id: f.id, name: f.name, hex: f.hex }));
  const glazingList = (glazingPackages ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    upgradeRateM2: Number(g.upgradeRateM2),
  }));

  const categorySlug = product.subCategory?.category?.slug;
  const subCategorySlug = product.subCategory?.slug;

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 24px' }}>
      <nav style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD' }}>
        <Link href="/" style={{ color: '#3E6E91' }}>Home</Link> /{' '}
        <Link href="/catalogue" style={{ color: '#3E6E91' }}>Catalogue</Link>
        {categorySlug && <> / <Link href={`/catalogue/${categorySlug}`} style={{ color: '#3E6E91' }}>{product.subCategory?.category?.name}</Link></>}
        {categorySlug && subCategorySlug && <> / <Link href={`/catalogue/${categorySlug}/${subCategorySlug}`} style={{ color: '#3E6E91' }}>{product.subCategory?.name}</Link></>}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 480px', gap: 32, marginTop: 20, alignItems: 'start' }}>
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#3E6E91' }}>{product.sku}</p>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 6 }}>{product.name}</h1>
          <p style={{ fontSize: 14, color: '#5C6773', marginTop: 10 }}>
            {product.configuration}
            {product.standardSize ? ` — ${product.standardSize}` : ''}
            {product.widthMm && product.heightMm ? ` · tested to ${product.widthMm}×${product.heightMm}mm` : ''}
          </p>

          <div style={{ height: 300, background: '#F5F3EE', borderRadius: 16, marginTop: 20, overflow: 'hidden' }}>
            {product.images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0].url} alt={product.images[0].altText} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
            <Fact label="From" value={formatRand(product.baseCost)} />
            <Fact label="Fulfilment" value={product.fulfilmentType.replace(/_/g, ' ')} />
            {product.stockLevel && <Fact label="In stock" value={`${Math.max(product.stockLevel.quantity - product.stockLevel.reserved, 0)}`} />}
          </div>

          {product.complianceRefs && product.complianceRefs.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, color: '#1B2733' }}>Compliance</h2>
              <ul style={{ marginTop: 10, paddingLeft: 18, color: '#5C6773', fontSize: 13.5, lineHeight: 1.8 }}>
                {product.complianceRefs.map((c) => (
                  <li key={c.id}>{c.standard}{c.issuer ? ` — ${c.issuer}` : ''}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <Configurator
          productId={product.id}
          sku={product.sku}
          maxWidthMm={product.widthMm ?? 3009}
          maxHeightMm={product.heightMm ?? 1509}
          finishes={finishList}
          glazingPackages={glazingList}
          discountTier="RETAIL"
        />
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderLeft: '2px solid #EAE6DC', paddingLeft: 14 }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#A9B2BD', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, marginTop: 3 }}>{value}</p>
    </div>
  );
}