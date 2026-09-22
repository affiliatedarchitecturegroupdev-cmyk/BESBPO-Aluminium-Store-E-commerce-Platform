'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RecentlyViewedProduct } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, sectionStyle, primaryImage } from './shared';
import { getSessionId, getToken } from '../../lib/session';
import { colors, fonts } from '../../tokens';

// §4 Recently Viewed — a personal shelf, hidden when the browser has nothing to show.
//
// This is the one section that must NOT render an empty state on the homepage. A first-time
// visitor has no history by definition, and a "nothing to see here" panel would be the first
// thing they read. So the section stays hidden until history exists, then appears.
//
// History is keyed by the signed-in user, or by an opaque per-browser session id for a guest.
// The API returns nothing when neither key is present, which is the honest answer — the section
// does not fall back to showing other shoppers' products.
export default function RecentlyViewedSection({ excludeSku }: { excludeSku?: string }) {
  const [items, setItems] = useState<RecentlyViewedProduct[] | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const token = getToken();
    if (!sessionId && !token) {
      setItems([]);
      return;
    }
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    const path = `/analytics/recently-viewed?${params.toString()}`;

    // The endpoint scopes history to the caller's own key, so the Authorization header matters;
    // `apiGet` is public by design, so the authed read goes through fetch directly here.
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}${path}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? (data as RecentlyViewedProduct[]) : []))
      .catch(() => setItems([]));
  }, []);

  // Keep the PDP out of its own shelf; the anchor product is the page you are on.
  const visible = (items ?? []).filter((p) => p.sku !== excludeSku).slice(0, 8);

  // Still loading, or genuinely nothing to show: render nothing rather than an empty panel.
  if (visible.length === 0) return null;

  return (
    <section id="recently-viewed" style={sectionStyle}>
      <SectionHeading eyebrow="Your history" title="Recently Viewed" subtitle="Picked up where you left off." />
      <div style={{ marginTop: 20, display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
        {visible.map((p) => (
          <Link
            key={p.sku}
            href={`/product/${p.sku}`}
            style={{ flex: '0 0 200px', background: '#fff', border: '1px solid #EAE6DC', borderRadius: 14, padding: 14, textDecoration: 'none', color: colors.slate }}
          >
            <div style={{ height: 104, background: colors.pane, borderRadius: 8, overflow: 'hidden' }}>
              {primaryImage(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage(p) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>
            <p style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.glass, marginTop: 10 }}>{p.sku}</p>
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{p.name}</p>
            <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 14.5, marginTop: 6, marginBottom: 0 }}>
              {formatRand(p.retailPrice)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
