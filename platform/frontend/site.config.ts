// Site-wide identity config — single source of truth for domain, corporate-site link,
// and social handles. Referenced by the header/footer components rather than hardcoded
// per-component, so a domain or handle change is a one-line edit.

export const siteConfig = {
  domain: 'aluminium.store',
  siteUrl: 'https://aluminium.store',

  // Link back to the corporate/marketing site (Aluminium-Store-Corporate-Website.html,
  // once deployed) — shown as a persistent header/footer link, not a one-time redirect.
  corporateSiteUrl: 'https://aluminiumstore.besbpo.co.za',
  corporateSiteLabel: 'Visit the Corporate Site',

  parentGroupUrl: 'https://besbpo.co.za',
  parentGroupLabel: 'Besbpo Group',

  // Shared Besbpo Group handles — used identically across all subsidiaries/divisions,
  // not Aluminium Store-specific. Five are live/active; three are registered as
  // placeholders pending setup (marked below) — do not treat those three as working
  // links until the Group confirms registration is complete.
  social: {
    x: 'https://x.com/BesbpoGroup',                          // live
    threads: 'https://www.threads.net/@besbpo_group',        // live
    instagram: 'https://instagram.com/besbpo_group',         // live
    tiktok: 'https://tiktok.com/@besbpo.group',               // live
    facebook: 'https://facebook.com/share/1HgNpvXCRd/',       // live
    whatsapp: 'https://wa.me/27683676276',                    // live — click-to-chat
    linkedin: 'https://linkedin.com/company/besbpo-group',    // placeholder — pending registration
    youtube: 'https://youtube.com/@BesbpoGroup',              // placeholder — pending registration
    behance: 'https://behance.net/besbpogroup',               // placeholder — pending registration
  },

  // Footer/UI should render live handles as normal links and placeholder handles either
  // omitted or visibly muted — never presented as equally "ready" to a site visitor.
  socialPlaceholderKeys: ['linkedin', 'youtube', 'behance'] as const,

  contactEmail: 'partners@besbpo.co.za',
} as const;
