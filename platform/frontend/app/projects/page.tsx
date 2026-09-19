import { serverFetch } from '../../lib/api';
import type { Project } from '../../lib/catalog-types';

// Route: /projects — full case-study listing. The homepage shows only featured=true
// projects in its hero slider; this page lists all of them (docs/33-projects-showcase.md).
export default async function Page() {
  const projects = await serverFetch<Project[]>('/projects');

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733' }}>Projects</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8 }}>Design → Manufacture (CMI) → Install, in practice.</p>

      {(!projects || projects.length === 0) ? (
        <p style={{ marginTop: 28, color: '#5C6773' }}>
          Case studies are a content-production task for the marketing team — this grid fills as
          real project photography and write-ups are published.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, marginTop: 28 }}>
          {projects.map((p) => (
            <article key={p.id} style={{ border: '1px solid #EAE6DC', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
              <div style={{ height: 180, background: '#F5F3EE' }}>
                {p.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </div>
              <div style={{ padding: 18 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#C08A4E' }}>{p.sector}</span>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, marginTop: 6 }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: '#5C6773', marginTop: 8 }}>{p.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}