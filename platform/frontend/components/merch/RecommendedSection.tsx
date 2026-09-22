'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RecommendationResult } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, sectionStyle, primaryImage } from './shared';
import { getSessionId, getToken } from '../../lib/session';
import { colors, fonts } from '../../tokens';

// §5 Recommended For You — states its basis, or does not appear.
//
// The section name invites the assumption that a personalisation engine is running. It is not:
// the current logic recommends more from the sub-category of the product you viewed last. So the
// section prints that basis plainly ("Because you viewed X — more Casement Frames"). A section
// that implied a model it does not have would be a small deception, and one a buyer would catch
// the moment the recommendations looked wrong.
//
// Like Recently Viewed, it stays hidden when there is no history rather than showing an empty
// panel to a first-time visitor.
export default function RecommendedSection({ excludeSku }: { excludeSku?: string }) {
  const [result, setResult] = useState<RecommendationResult | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const token = getToken();
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}/analytics/recommended?${params.toString()}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setResult((data as RecommendationResult | null) ?? null))
      .catch(() => setResult(null));
  }, []);

  const items = (result?.items ?? []).filter((p) => p.sku !== excludeSku).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section id="recommended" style={sectionStyle}>
      <SectionHeading
        eyebrow="Based on your viewing"
        title="Recommended For You"
        subtitle={result?.reason}
        basis={result?.basis ? `Anchor: ${result.basis.anchorSku}` : undefined}
      />
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {items.map((p) => (
          <Link
            key={p.sku}
            href={`/product/${p.sku}`}
            style={{ background: '#fff', border: '1px solid #EAE6DC', borderRadius: 14, padding: 16, textDecoration: 'none', color: colors.slate }}
          >
            <div style={{ height: 120, background: colors.pane, borderRadius: 8, overflow: 'hidden' }}>
              {primaryImage(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage(p) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>
            <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, marginTop: 12 }}>{p.sku}</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{p.name}</p>
            <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 15.5, marginTop: 8, marginBottom: 0 }}>
              {formatRand(p.retailPrice)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
