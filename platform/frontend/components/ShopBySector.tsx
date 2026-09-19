import Link from 'next/link';

const SECTORS = [
  { slug: 'commercial', name: 'Commercial', desc: 'Shopfronts, curtain walling, office partitioning' },
  { slug: 'industrial', name: 'Industrial', desc: 'Louvre ventilation, security doors, structural extrusion' },
  { slug: 'institutional', name: 'Institutional', desc: 'Schools, healthcare, public buildings — SANS/AAAMSA specified' },
  { slug: 'residential', name: 'Residential', desc: 'The full range, from standard windows to custom entrances' },
];

export default function ShopBySector() {
  return (
    <section style={{ padding: '64px 32px', maxWidth: 1240, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733' }}>Shop by Sector</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginTop: 24 }}>
        {SECTORS.map((s) => (
          <Link key={s.slug} href={`/catalogue?sector=${s.slug}`} style={{
            display: 'block', padding: 22, borderRadius: 14, background: '#fff',
            border: '1px solid #EAE6DC', textDecoration: 'none', color: '#1B2733',
          }}>
            <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', margin: 0, fontSize: 16 }}>{s.name}</h4>
            <p style={{ fontSize: 12.5, color: '#5C6773', marginTop: 8 }}>{s.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
