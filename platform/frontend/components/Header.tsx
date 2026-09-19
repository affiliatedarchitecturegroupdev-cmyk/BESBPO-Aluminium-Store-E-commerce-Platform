'use client';

import Link from 'next/link';
import { useState } from 'react';
import { siteConfig } from '../site.config';

const NAV_LINKS: [string, string][] = [
  ['Catalogue', '/catalogue'],
  ['Projects', '/projects'],
  ['Business Desk', '/business/dashboard'],
  ['Help', '/help'],
  ['Contact', '/contact'],
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#1B2733', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
          ALUMINIUM STORE
        </Link>

        <nav style={{ display: 'flex', gap: 26, alignItems: 'center' }} className="desktop-nav">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} style={{ color: '#D7DBE0', fontSize: 13.5, textDecoration: 'none' }}>{label}</Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href={siteConfig.corporateSiteUrl} style={{ fontSize: 12, color: '#7FB0D6', textDecoration: 'none' }} title={siteConfig.corporateSiteLabel}>
            ← Corporate Site
          </a>
          <Link href="/cart" aria-label="Cart" style={{ color: '#fff', textDecoration: 'none', fontSize: 18 }}>🛒</Link>
          <Link href="/login" style={{
            background: '#C08A4E', color: '#fff', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            Sign In
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            style={{ display: 'none', background: 'none', border: 'none', color: '#fff', fontSize: 22 }}
            className="mobile-toggle"
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav style={{ background: '#243244', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 15 }}>
              {label}
            </Link>
          ))}
        </nav>
      )}

      <style>{`
        @media (max-width: 860px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </header>
  );
}
