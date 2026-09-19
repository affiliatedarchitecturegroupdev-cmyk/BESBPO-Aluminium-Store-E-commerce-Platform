import Link from 'next/link';
import { siteConfig } from '../site.config';

// Real, named SA payment platforms shown as trust badges. Displaying a badge here is not
// the same as live checkout integration — see docs/22-service-providers.md and the
// `payments` module for which of these are actually wired to a live gateway vs shown for
// buyer familiarity/trust only.
const PAYMENT_BADGES = [
  'PayFast', 'Ozow', 'SnapScan', 'Zapper', 'PayJustNow', 'Mobicred',
  'Payflex', 'RCS', 'Yoco', 'Lulapay', 'PayGate', 'Peach Payments',
];

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', x: 'X', threads: 'Threads',
  tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', behance: 'Behance', whatsapp: 'WhatsApp',
};

export default function Footer() {
  const social = siteConfig.social;
  const placeholders = new Set<string>(siteConfig.socialPlaceholderKeys as readonly string[]);

  return (
    <footer style={{ background: '#1B2733', color: '#F5F3EE', padding: '64px 24px 28px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        {/* ---- Top: brand + link columns ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 32, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 18, margin: 0 }}>ALUMINIUM STORE</p>
            <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 4 }}>A Specialised Operating Division of Besbpo Group</p>
            <p style={{ fontSize: 13, color: '#A9B2BD', marginTop: 16, maxWidth: 260 }}>
              Design, manufacture, and installation of the full architectural aluminium range across South Africa.
            </p>
            <a href={siteConfig.corporateSiteUrl} style={{ display: 'inline-block', marginTop: 14, fontSize: 13, color: '#7FB0D6' }}>
              {siteConfig.corporateSiteLabel} →
            </a>
          </div>

          <FooterCol title="Shop" links={[
            ['Windows', '/catalogue/windows'], ['Doors', '/catalogue/doors'],
            ['Facade & Structural', '/catalogue/facade-structural-systems'],
            ['Outdoor Living', '/catalogue/outdoor-living-shading'],
            ['All Categories', '/catalogue'],
          ]} />

          <FooterCol title="Company" links={[
            ['About Us', '/about'], ['The CMI Model', '/#cmi'], ['Projects', '/projects'],
            ['Blog', '/blog'], ['Contact Us', '/contact'],
          ]} />

          <FooterCol title="Support" links={[
            ['Help Center / FAQ', '/help'], ['Store Locator', '/store-locator'],
            ['Track an Order', '/account/orders'], ['Request a Quote', '/quote/new'],
            ['Business Desk', '/business/dashboard'],
          ]} />

          <FooterCol title="Legal" links={[
            ['Terms & Conditions', '/legal/terms'], ['Privacy Policy', '/legal/privacy'],
            ['Cookie Policy', '/legal/cookies'], ['Returns & Refunds', '/legal/returns'],
            ['PAIA Manual', '/legal/paia-manual'], ['Accessibility', '/legal/accessibility'],
          ]} />
        </div>

        {/* ---- Group info strip ---- */}
        <div style={{ padding: '28px 0', borderBottom: '1px solid rgba(255,255,255,.1)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: 12.5, color: '#A9B2BD', lineHeight: 1.7 }}>
            <strong style={{ color: '#F5F3EE' }}>Besbpo Group (Pty) Ltd</strong> — parent company, 38+ divisions across
            Built Environment, Real Estate, BPO, Logistics, Consultancy, and Security.{' '}
            <a href={siteConfig.parentGroupUrl} style={{ color: '#7FB0D6' }}>{siteConfig.parentGroupLabel} →</a>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {Object.entries(social).map(([key, url]) => {
              if (!url) return null;
              const isPlaceholder = placeholders.has(key);
              return (
                <a
                  key={key}
                  href={isPlaceholder ? undefined : url}
                  aria-disabled={isPlaceholder}
                  title={isPlaceholder ? `${SOCIAL_LABELS[key]} — coming soon` : SOCIAL_LABELS[key]}
                  style={{
                    fontSize: 12, fontFamily: 'IBM Plex Mono, monospace',
                    color: isPlaceholder ? '#5C6773' : '#F5F3EE',
                    opacity: isPlaceholder ? 0.5 : 1,
                    pointerEvents: isPlaceholder ? 'none' : 'auto',
                    textDecoration: 'none', border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 999, padding: '6px 12px',
                  }}
                >
                  {SOCIAL_LABELS[key]}
                </a>
              );
            })}
          </div>
        </div>

        {/* ---- Payment trust badges ---- */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#A9B2BD', letterSpacing: '.1em', marginBottom: 12 }}>
            SECURE PAYMENT OPTIONS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {PAYMENT_BADGES.map((name) => (
              <span key={name} style={{
                fontSize: 11.5, color: '#D7DBE0', background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '5px 10px',
              }}>
                {name}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: '#5C6773', marginTop: 10, maxWidth: 640 }}>
            Badges shown reflect payment methods widely used by South African shoppers. Not every
            method listed is a live checkout integration on this site — see checkout for the
            options actually available on your order.
          </p>
        </div>

        <div style={{ paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: 11.5, fontFamily: 'IBM Plex Mono, monospace', color: '#A9B2BD' }}>
            © {new Date().getFullYear()} ALUMINIUM STORE — A SPECIALISED OPERATING DIVISION OF BESBPO GROUP
          </p>
          <p style={{ fontSize: 11.5, fontFamily: 'IBM Plex Mono, monospace', color: '#C08A4E' }}>FRAMED IN LIGHT.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '.08em', color: '#A9B2BD', marginBottom: 14 }}>
        {title.toUpperCase()}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} style={{ fontSize: 13.5, color: '#D7DBE0', textDecoration: 'none' }}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
