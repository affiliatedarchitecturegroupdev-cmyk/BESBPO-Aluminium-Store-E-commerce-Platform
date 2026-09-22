// Scrolling announcement strip — CMS-driven (ContentBlock, type ANNOUNCEMENT); the array below
// is the fallback for when the CMS has no live announcements, so the strip is never empty on a
// deployment where no one has edited the copy yet. Sits directly under the hero, above the fold.
const FALLBACK_ANNOUNCEMENTS = [
  'Free delivery on orders over R15,000',
  'NRCS VC 9003 approved safety glass on every SKU',
  'Trade accounts: 12% off from day one',
  '7-day cooling-off period on all standard stock orders',
  'Now delivering to all 9 provinces',
];

export default function AnnouncementTicker({ announcements }: { announcements?: string[] }) {
  const items = announcements?.length ? announcements : FALLBACK_ANNOUNCEMENTS;
  const looped = [...items, ...items]; // duplicated for seamless CSS loop

  return (
    <div style={{ background: '#243244', overflow: 'hidden', padding: '10px 0' }}>
      <div
        style={{
          display: 'flex', gap: 48, width: 'max-content',
          animation: 'ticker-scroll 28s linear infinite',
        }}
      >
        {looped.map((text, i) => (
          <span key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: '#D7DBE0', whiteSpace: 'nowrap' }}>
            {text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
