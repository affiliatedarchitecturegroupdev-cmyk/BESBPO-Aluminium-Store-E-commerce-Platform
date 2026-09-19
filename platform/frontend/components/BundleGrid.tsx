export type BundleCard = { id: string; name: string; description?: string; discountPct: number; itemCount: number };

// Real data from GET /api/v1/promotions/bundles — illustrative props until wired.
export default function BundleGrid({ bundles, anchorId }: { bundles: BundleCard[]; anchorId?: string }) {
  return (
    <section id={anchorId} style={{ padding: '56px 32px', maxWidth: 1240, margin: '0 auto', background: '#F5F3EE', borderRadius: 24 }}>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, color: '#1B2733' }}>Bundles</h2>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 6 }}>Grouped essentials, priced together for less.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 22 }}>
        {bundles.map((b) => (
          <div key={b.id} style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #EAE6DC' }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#C08A4E' }}>
              SAVE {(b.discountPct * 100).toFixed(0)}%
            </span>
            <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', marginTop: 8 }}>{b.name}</h4>
            {b.description && <p style={{ fontSize: 12.5, color: '#5C6773' }}>{b.description}</p>}
            <p style={{ fontSize: 11.5, color: '#A9B2BD', marginTop: 8 }}>{b.itemCount} items in this bundle</p>
          </div>
        ))}
      </div>
    </section>
  );
}
