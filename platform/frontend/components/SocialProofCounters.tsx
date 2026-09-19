'use client';

import { useEffect, useRef, useState } from 'react';

const STATS = [
  { target: 2147, label: 'SKUs in Catalogue', suffix: '' },
  { target: 7, label: 'Provinces Served', suffix: '' },
  { target: 7, label: 'Product Categories', suffix: '' },
  { target: 100, label: 'NRCS-Approved Safety Glass', suffix: '%' },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1400;
        const start = performance.now();
        function tick(now: number) {
          const p = Math.min((now - start) / duration, 1);
          setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>;
}

export default function SocialProofCounters() {
  return (
    <div style={{ background: '#1B2733', padding: '40px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ borderLeft: '2px solid rgba(255,255,255,.15)', paddingLeft: 18 }}>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 32, color: '#fff', margin: 0 }}>
              <Counter target={s.target} suffix={s.suffix} />
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD', marginTop: 4, textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
