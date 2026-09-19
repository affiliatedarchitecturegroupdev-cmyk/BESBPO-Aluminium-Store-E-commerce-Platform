import { serverFetch } from '../../lib/api';
import type { LocationRecord } from '../../lib/content-types';

// Route: /store-locator — reuses the existing Location model (already home to stock levels
// and hub-capacity data) rather than a new model (docs/27-content-pages.md).
export default async function Page() {
  const locations = await serverFetch<LocationRecord[]>('/catalog/locations');

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733' }}>Store Locator</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8 }}>Production hubs and Click &amp; Collect points.</p>

      {(!locations || locations.length === 0) ? (
        <p style={{ marginTop: 24, color: '#5C6773' }}>No locations published yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
          {locations.map((l) => (
            <div key={l.id} style={{ border: '1px solid #EAE6DC', borderRadius: 12, padding: 20 }}>
              <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', margin: 0 }}>{l.name}</h4>
              <p style={{ fontSize: 12.5, color: '#5C6773', marginTop: 6 }}>
                {l.address} · {l.province.replace(/_/g, ' ')}{l.isHub ? ' — Production Hub' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}