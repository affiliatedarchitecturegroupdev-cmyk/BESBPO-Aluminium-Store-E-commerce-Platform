import Link from 'next/link';
import { formatRand, type Product } from '../lib/catalog-types';

// Shared product tile used by /catalogue, /catalogue/[category] and
// /catalogue/[category]/[subcategory].
export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.sku}`}
      style={{ background: '#fff', border: '1px solid #EAE6DC', borderRadius: 14, padding: 18, textDecoration: 'none', color: '#1B2733' }}
    >
      <div style={{ height: 130, background: '#F5F3EE', borderRadius: 10, overflow: 'hidden' }}>
        {product.images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0].url} alt={product.images[0].altText} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91', marginTop: 12 }}>{product.sku}</p>
      <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{product.name}</p>
      {product.configuration && <p style={{ fontSize: 12, color: '#5C6773', marginTop: 4 }}>{product.configuration}</p>}
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, marginTop: 10 }}>{formatRand(product.retailPrice)}</p>
      {product.fulfilmentType !== 'STOCK' && (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#C08A4E', marginTop: 6 }}>
          {product.fulfilmentType === 'CMI_PARTNER_NETWORK' ? 'CMI NETWORK' : 'MADE TO ORDER'}
        </p>
      )}
    </Link>
  );
}