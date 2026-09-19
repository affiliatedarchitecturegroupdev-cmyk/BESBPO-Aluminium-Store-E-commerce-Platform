// One of the 8 in-store ad placement slots shown between homepage sections.
// Real data from GET /api/v1/advertisements/active, filtered to this slot number.
// See docs/32-ad-placements.md — these are internal promotional placements, not a
// third-party ad-serving system.
export type AdData = { slot: number; campaignName: string; imageUrl?: string; linkUrl: string };

export default function AdSlot({ ad }: { ad: AdData | null }) {
  if (!ad) return null;
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 56px' }}>
      <a href={ad.linkUrl} style={{ display: 'block', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <div style={{ height: 160, background: 'linear-gradient(120deg, #2C4F6B, #1B2733)', display: 'flex', alignItems: 'center', padding: '0 40px' }}>
          <div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#C08A4E', letterSpacing: '.1em' }}>ADVERTISEMENT</span>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, color: '#fff', marginTop: 6 }}>{ad.campaignName}</p>
          </div>
        </div>
      </a>
    </div>
  );
}
