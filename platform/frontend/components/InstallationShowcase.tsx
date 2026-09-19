'use client';

import { useEffect, useState } from 'react';

// The midsection showcasing Design → Manufacture (CMI) → Install, featuring a projects
// hero slider pulling from featured Project records. See docs/33-projects-showcase.md.
// Real project data from GET /api/v1/projects/featured — illustrative props until wired.
export type FeaturedProject = { id: string; title: string; sector: string; imageUrl: string };

const STEPS = [
  { n: '01', title: 'Design', desc: 'Specified with Bellwether Architecture & Engineering — glazing, façade, and structural detailing.' },
  { n: '02', title: 'Manufacture', desc: 'Built in-house or through the vetted CMI Partner Network, to one issued specification.' },
  { n: '03', title: 'Install', desc: 'Delivered and fitted nationally — Besfleet handles the fragile-glazing logistics.' },
];

export default function InstallationShowcase({ projects }: { projects: FeaturedProject[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (projects.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % projects.length), 5000);
    return () => clearInterval(t);
  }, [projects.length]);

  const project = projects[current];

  return (
    <section style={{ background: '#1B2733', padding: '72px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#C08A4E', letterSpacing: '.2em' }}>INSTALLATION & SALES</span>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#fff', marginTop: 10, maxWidth: 620 }}>
          We design it, manufacture it through our CMI network, and install it.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40, alignItems: 'center' }}>
          <div>
            {STEPS.map((s) => (
              <div key={s.n} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, color: '#C08A4E', fontWeight: 700 }}>{s.n}</span>
                <div>
                  <h4 style={{ color: '#fff', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>{s.title}</h4>
                  <p style={{ color: '#A9B2BD', fontSize: 13.5, marginTop: 6, maxWidth: 380 }}>{s.desc}</p>
                </div>
              </div>
            ))}
            <a href="/quote/new" style={{
              display: 'inline-block', marginTop: 8, background: '#C08A4E', color: '#fff',
              padding: '13px 26px', borderRadius: 999, fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}>
              Request a Project Quote
            </a>
          </div>

          {/* Projects hero slider */}
          <div style={{ position: 'relative', height: 340, borderRadius: 18, overflow: 'hidden', background: '#2C4F6B' }}>
            {project ? (
              <>
                <div style={{ position: 'absolute', inset: 0, background: `url(${project.imageUrl}) center/cover` }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(15,22,29,.9) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#C08A4E' }}>{project.sector.toUpperCase()}</span>
                  <p style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, marginTop: 4 }}>{project.title}</p>
                </div>
                <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: 6 }}>
                  {projects.map((_, i) => (
                    <span key={i} style={{ width: 18, height: 3, borderRadius: 2, background: i === current ? '#C08A4E' : 'rgba(255,255,255,.4)' }} />
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: '#A9B2BD', padding: 24 }}>Featured project case studies coming soon.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
