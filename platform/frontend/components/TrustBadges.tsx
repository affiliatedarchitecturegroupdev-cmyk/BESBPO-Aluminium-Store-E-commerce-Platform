const BADGES = [
  { label: '3D Secure 2.0', desc: 'Verified card checkout' },
  { label: 'NRCS VC 9003', desc: 'Approved safety glass' },
  { label: 'AAAMSA Certified', desc: 'Performance tested' },
  { label: 'POPIA Compliant', desc: 'Your data, protected' },
  { label: 'ECTA 7-Day Cooling-Off', desc: 'On standard stock orders' },
];

export default function TrustBadges() {
  return (
    <div style={{ background: '#F5F3EE', padding: '28px 0', borderTop: '1px solid #EAE6DC', borderBottom: '1px solid #EAE6DC' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }}>
        {BADGES.map((b) => (
          <div key={b.label} style={{ textAlign: 'center', minWidth: 150 }}>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 13.5, color: '#1B2733', margin: 0 }}>{b.label}</p>
            <p style={{ fontSize: 11.5, color: '#5C6773', marginTop: 3 }}>{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
