'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DailyDeal } from '../../lib/merchandising-types';
import { formatRand } from '../../lib/catalog-types';
import { SectionHeading, SectionEmpty, sectionStyle, primaryImage } from './shared';
import { colors, fonts } from '../../tokens';

// §6 Deals of the Day — a countdown-driven strip.
//
// The clock here is presentation only: the server refuses a claim past the end time (and past the
// stock cap) regardless of what the browser believes, so a device with a wrong clock cannot buy
// into a closed deal. When the countdown reaches zero the card switches to "Ended" rather than
// showing a negative timer, and that state is reached without another request.
//
// `remaining` and `soldOut` are computed server-side from the same counters the claim guard uses,
// so the progress bar can never disagree with what checkout will allow.
function Countdown({ ms }: { ms: number }) {
  // Ticking locally from a start value avoids a request per second; the server remains the
  // authority on whether a claim is still valid.
  const [remaining, setRemaining] = useState(ms);

  useEffect(() => {
    setRemaining(ms);
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, [ms]);

  if (remaining <= 0) {
    return <span style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver }}>Ended</span>;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span style={{ fontFamily: fonts.mono, fontSize: 11, color: '#9C6B35', fontWeight: 600 }}>
      {h > 0 ? `${pad(h)}:` : ''}
      {pad(m)}:{pad(s)} left
    </span>
  );
}

export default function DailyDealsSection({ deals }: { deals: DailyDeal[] }) {
  if (deals.length === 0) {
    return (
      <section id="daily-deals" style={sectionStyle}>
        <SectionHeading eyebrow="Ends at midnight" title="Deals of the Day" />
        <SectionEmpty
          message="There is no deal running right now."
          hint="Deals are scheduled by the merchandising desk — check back later today."
        />
      </section>
    );
  }

  return (
    <section id="daily-deals" style={sectionStyle}>
      <SectionHeading
        eyebrow="Today only"
        title="Deals of the Day"
        subtitle="A capped quantity at a reduced price. The counter below is the live stock remaining at that price."
        basis="Stock is enforced at checkout, not just displayed"
      />

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {deals.map((d) => {
          const pct = d.stockLimit > 0 ? Math.round((d.claimed / d.stockLimit) * 100) : 0;
          return (
            <Link
              key={d.id}
              href={`/product/${d.product.sku}`}
              style={{
                background: '#fff',
                border: '1px solid #EAE6DC',
                borderRadius: 14,
                padding: 20,
                textDecoration: 'none',
                color: colors.slate,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: fonts.mono, fontSize: 10, background: '#9C6B35', color: '#fff', padding: '3px 8px', borderRadius: 999 }}>
                  DEAL
                </span>
                <Countdown ms={d.msRemaining} />
              </div>

              {primaryImage(d.product) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImage(d.product) as string}
                  alt=""
                  style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 10, marginTop: 12 }}
                />
              ) : (
                <div style={{ height: 150, background: colors.pane, borderRadius: 10, marginTop: 12 }} />
              )}

              <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.glass, marginTop: 14 }}>{d.product.sku}</p>
              <p style={{ fontSize: 14.5, fontWeight: 600, margin: '4px 0 0' }}>{d.headline ?? d.product.name}</p>

              <p style={{ marginTop: 10, marginBottom: 0 }}>
                <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 18, color: '#9C6B35' }}>
                  {formatRand(d.dealPrice)}
                </span>
                <span style={{ fontSize: 12.5, color: colors.silver, textDecoration: 'line-through', marginLeft: 8 }}>
                  {formatRand(d.product.retailPrice)}
                </span>
              </p>

              <div style={{ marginTop: 14 }}>
                <div style={{ height: 6, background: colors.pane, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: d.soldOut ? '#A9B2BD' : colors.brass }} />
                </div>
                <p style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.silver, margin: '6px 0 0' }}>
                  {d.soldOut ? 'Sold out at this price' : `${d.remaining} of ${d.stockLimit} left`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
