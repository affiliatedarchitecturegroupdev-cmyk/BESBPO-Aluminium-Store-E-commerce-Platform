'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin/catalogue — merchandising view of the master catalogue. Reads the public
// listing endpoint (GET /catalog/products) plus the two-dimension catalogue signal: how many
// SKUs are active and which sub-categories carry stock vs made-to-order lines.
//
// Create/edit/delete exist on the API and are guarded to ADMIN/STAFF, but this page is
// deliberately read-only: a form that could reprice a live product without a confirmation
// step is not something to hand a user before the pricing-review workflow is specified.

type ProductList = {
  items: {
    id: string;
    sku: string;
    name: string;
    active: boolean;
    fulfilmentType: string;
    baseCost: string;
    subCategory: { name: string; category: { name: string } };
  }[];
  total: number;
};

export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<ProductList | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<ProductList>('/catalog/products?take=120').then((result) => {
      if (cancelled) return;
      if (result.ok) setData(result.data);
      else setDenied(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (denied) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#B03A32' }}>This area is for Aluminium Store staff.</p></main>;
  }

  const items = data?.items ?? [];
  const madeToOrder = items.filter((i) => i.fulfilmentType === 'MADE_TO_ORDER').length;

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Catalogue</h1>

      {data === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading catalogue…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 28, marginTop: 20 }}>
            <Metric label="Active SKUs" value={`${data.total}`} />
            <Metric label="Made to order" value={`${madeToOrder}`} />
            <Metric label="Stock lines" value={`${items.length - madeToOrder}`} />
          </div>

          <table style={{ width: '100%', marginTop: 28, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#A9B2BD', fontWeight: 500 }}>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #EAE6DC' }}>
                  <td style={{ ...tdStyle, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5 }}>{p.sku}</td>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={{ ...tdStyle, color: '#5C6773' }}>{p.subCategory.category.name} · {p.subCategory.name}</td>
                  <td style={{ ...tdStyle, color: p.fulfilmentType === 'MADE_TO_ORDER' ? '#C08A4E' : '#5C6773' }}>
                    {p.fulfilmentType.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, color: '#1B2733', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#A9B2BD', margin: '4px 0 0' }}>{label}</p>
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 1050, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const thStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em' };
const tdStyle: React.CSSProperties = { padding: '10px', color: '#1B2733' };