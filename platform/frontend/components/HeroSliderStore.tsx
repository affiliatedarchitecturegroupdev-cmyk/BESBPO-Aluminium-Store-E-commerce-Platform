'use client';

import { useEffect, useState } from 'react';

// The STORE's hero is commercial/promotional — distinct from the corporate site's 5-slide
// brand-story hero. Content here is meant to be CMS-driven (ContentBlock, type HERO_SLIDE)
// rather than hardcoded — the array below is a realistic illustrative set until the CMS
// content is populated. See docs/19-cms.md.
type Slide = { tag: string; title: string; sub: string; ctaLabel: string; ctaHref: string; bg: string };

// Shape the homepage passes for CMS-managed slides.
export type StoreHeroSlide = Slide;

const SLIDES: Slide[] = [
  { tag: 'New Season', title: 'IGU Double-Glazed windows, now standard-priced', sub: 'Every sliding and casement window offered in both single and double-glazed packages.', ctaLabel: 'Shop Windows', ctaHref: '/catalogue/windows', bg: '#1B2733' },
  { tag: 'Bundle Deal', title: 'Complete door + hardware bundles', sub: 'Save when you order the door, handle set, and lock together.', ctaLabel: 'Shop Bundles', ctaHref: '/#bundles', bg: '#2C4F6B' },
  // "up to 35% off" matches the deepest clearance markdown actually seeded; the copy names the
  // lines rather than a finish, because the clearance set is mixed and changes. A hero claiming a
  // discount or a finish the catalogue no longer carries is misleading marketing (CPA s.41).
  { tag: 'Clearance', title: 'End-of-line stock — up to 35% off', sub: 'Selected windows, doors and hardware while it lasts.', ctaLabel: 'Shop Clearance', ctaHref: '/catalogue?clearance=1', bg: '#9C6B35' },
  { tag: 'Trending', title: 'Pivot entrance doors are this month\u2019s top search', sub: 'A statement entrance, made to your opening.', ctaLabel: 'Explore Pivot Doors', ctaHref: '/catalogue/doors', bg: '#1B2733' },
  { tag: 'New Arrivals', title: 'Bay & Bow window units now in the catalogue', sub: '48 new SKUs across 3 configurations.', ctaLabel: 'See What\u2019s New', ctaHref: '/#recent-arrivals', bg: '#3E6E91' },
  { tag: 'Business', title: 'Trade accounts — 12% off, from day one', sub: 'Apply for a Business Desk account for your company.', ctaLabel: 'Apply for Trade', ctaHref: '/business/dashboard', bg: '#1B2733' },
  { tag: 'CMI Network', title: 'Large curtain-wall project? We route it right.', sub: 'Our own hubs plus a vetted national partner network.', ctaLabel: 'Request a Quote', ctaHref: '/quote/new', bg: '#2C4F6B' },
  { tag: 'Outdoor Living', title: 'Pergola season starts now', sub: 'Fixed-slat, louvre-roof, and gable pergolas — supplied and installed.', ctaLabel: 'Shop Pergolas', ctaHref: '/catalogue/outdoor-living-shading', bg: '#9C6B35' },
  { tag: 'Compliance', title: 'Every safety-glazing line is NRCS-approved', sub: 'AAAMSA and NRCS VC 9003 compliant, from the first SKU.', ctaLabel: 'Read Our Compliance Standard', ctaHref: '/about#compliance', bg: '#1B2733' },
  { tag: 'National Reach', title: 'Now delivering to all nine provinces', sub: 'Same online-first reach as Roofsteel and Bricksplaza.', ctaLabel: 'Check Delivery', ctaHref: '/store-locator', bg: '#3E6E91' },
];

export default function HeroSliderStore({ slides }: { slides?: StoreHeroSlide[] }) {
  const deck = slides?.length ? slides : SLIDES;
  const [current, setCurrent] = useState(0);

  // A shorter deck (the CMS may hold one slide) must not leave `current` past its end.
  useEffect(() => {
    if (current >= deck.length) setCurrent(0);
  }, [deck.length, current]);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % deck.length), 5500);
    return () => clearInterval(t);
  }, [deck.length]);

  const slide = deck[current];

  return (
    <section
      style={{
        position: 'relative', height: '70vh', minHeight: 460, overflow: 'hidden',
        background: slide.bg, transition: 'background 0.8s ease',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: '.2em', color: '#C08A4E', textTransform: 'uppercase' }}>
          {slide.tag}
        </span>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(28px,4vw,48px)', color: '#fff', maxWidth: 640, marginTop: 14 }}>
          {slide.title}
        </h1>
        <p style={{ color: '#D7DBE0', maxWidth: 480, marginTop: 12, fontSize: 15.5 }}>{slide.sub}</p>
        <a
          href={slide.ctaHref}
          style={{
            display: 'inline-block', marginTop: 26, background: '#C08A4E', color: '#fff',
            padding: '13px 28px', borderRadius: 999, fontWeight: 600, fontSize: 14, textDecoration: 'none', width: 'fit-content',
          }}
        >
          {slide.ctaLabel}
        </a>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 32, right: 32, display: 'flex', gap: 8 }}>
        {deck.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: 24, height: 3, borderRadius: 2, border: 'none', cursor: 'pointer',
              background: i === current ? '#C08A4E' : 'rgba(255,255,255,.3)',
            }}
          />
        ))}
      </div>
    </section>
  );
}
