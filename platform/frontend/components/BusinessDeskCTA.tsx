export default function BusinessDeskCTA() {
  return (
    <section style={{ padding: '56px 32px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(120deg, #1B2733, #2C4F6B)', borderRadius: 20, padding: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#C08A4E', letterSpacing: '.1em' }}>FOR BUSINESSES</span>
          <h3 style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, marginTop: 8 }}>
            Trade pricing, team accounts, and statements — the Business Desk.
          </h3>
        </div>
        <a href="/business/dashboard" style={{ background: '#C08A4E', color: '#fff', padding: '13px 26px', borderRadius: 999, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Open the Business Desk
        </a>
      </div>
    </section>
  );
}
