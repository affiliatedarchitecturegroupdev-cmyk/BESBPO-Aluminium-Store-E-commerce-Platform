import Link from 'next/link';

// App-wide 404. Reached by `notFound()` calls and by any unmatched route, and served with a real
// HTTP 404 so a missing page (or an unknown collection slug) is not indexed as a soft 404.
export default function NotFound() {
  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 24px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD', letterSpacing: '.08em' }}>404</p>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733', marginTop: 10 }}>
        We could not find that page
      </h1>
      <p style={{ fontSize: 14, color: '#5C6773', marginTop: 12, maxWidth: 520, lineHeight: 1.7 }}>
        The link may be out of date, or the product or collection may have been withdrawn.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <Link href="/" style={cta('#1B2733')}>Back to the homepage</Link>
        <Link href="/catalogue" style={cta('#fff', '#1B2733')}>Browse the catalogue</Link>
      </div>
    </main>
  );
}

function cta(background: string, color = '#fff'): React.CSSProperties {
  return {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    padding: '11px 20px',
    borderRadius: 999,
    textDecoration: 'none',
    background,
    color,
    border: '1px solid #1B2733',
  };
}
