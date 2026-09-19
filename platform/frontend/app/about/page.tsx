// Route: /about — brand narrative, mission, and compliance summary.
// Content served from ContentBlock (CMS) in production — see docs/27-content-pages.md.
export default function Page() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', letterSpacing: '.1em' }}>ABOUT US</p>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 34, color: '#1B2733' }}>Framed in Light.</h1>
      <p style={{ fontSize: 15.5, color: '#2A2A2A', marginTop: 18, maxWidth: 640, lineHeight: 1.7 }}>
        Aluminium Store is Besbpo Group's specialised operating division for the sale, design,
        and custom manufacture of aluminium products — serving commercial, industrial,
        institutional, and residential sectors across South Africa.
      </p>
      <section id="compliance" style={{ marginTop: 48 }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, color: '#1B2733' }}>Compliance, from the first SKU</h2>
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 10, maxWidth: 600 }}>
          AAAMSA Performance Certification, NRCS VC 9003 safety-glass approval, SANS 10400-XA /
          SAFIERA energy ratings, and SANS 613 / SANS 1044 material and fenestration standards —
          see our <a href="/legal/paia-manual" style={{ color: '#3E6E91' }}>PAIA Manual</a> for
          company records requests.
        </p>
      </section>
    </main>
  );
}
