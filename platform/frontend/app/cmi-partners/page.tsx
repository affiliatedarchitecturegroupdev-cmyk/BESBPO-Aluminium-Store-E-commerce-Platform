import { serverFetch } from '../../lib/api';

// Route: /cmi-partners — public trust page for the Contract Manufacturing Issuer network.
// Server-rendered from GET /cmi-routing/partners, which returns only the vetted-and-capability
// view: names, provinces, capability tags and compliance flags. Partner capacity and commercial
// terms are deliberately not published (docs/06-cmi-partner-routing.md).
//
// Why this page exists at all: a buyer placing a large curtain-walling order is handing the job
// to a third party, so who that network is and how it is vetted is part of the purchase
// decision, not back-office detail.

type Partner = {
  id: string;
  name: string;
  province: string;
  capabilities: string[];
  vettedSince: string | null;
  nrcsApproved: boolean;
  aaamsaMember: boolean;
};

// The storefront must render even when the API is unreachable — an empty state, not a 500.
// `serverFetch` already returns null rather than throwing in that case.
function getPartners(): Promise<Partner[] | null> {
  return serverFetch<Partner[]>('/cmi-routing/partners', 300);
}

function titleCase(v: string) {
  return v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function Page() {
  const partners = await getPartners();

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', letterSpacing: '.1em' }}>CMI PARTNER NETWORK</p>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 34, color: '#1B2733', margin: '8px 0 0' }}>
        Vetted fabrication, centrally specified.
      </h1>
      <p style={{ fontSize: 15, color: '#5C6773', marginTop: 16, maxWidth: 620, lineHeight: 1.7 }}>
        Large curtain-walling, shopfront and structural-glazing orders can exceed any single
        Aluminium Store hub&apos;s fabrication capacity. Those orders are routed to a Contract
        Manufacturing Issuer — a partner that fabricates to our specification while the design,
        quality standard and brand promise stay centrally issued. Routing proposes a partner;
        an Aluminium Store engineer reviews and confirms it before any work starts.
      </p>

      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, color: '#1B2733', marginTop: 44 }}>
        Network partners
      </h2>

      {partners === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 12 }}>
          Partner information is temporarily unavailable. Please try again shortly.
        </p>
      ) : partners.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 12 }}>
          Partner information is being updated.
        </p>
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {partners.map((p) => (
            <article key={p.id} style={{ border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, color: '#1B2733', margin: 0 }}>{p.name}</h3>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', margin: '6px 0 12px' }}>
                {titleCase(p.province)}
              </p>
              <p style={{ fontSize: 13, color: '#5C6773', margin: 0 }}>
                {p.capabilities.length > 0 ? p.capabilities.join(' · ') : 'General fabrication'}
              </p>
              <p style={{ fontSize: 12, color: '#A9B2BD', margin: '12px 0 0' }}>
                {p.nrcsApproved ? 'NRCS-approved systems' : 'NRCS approval pending'}
                {p.aaamsaMember ? ' · AAAMSA member' : ''}
                {p.vettedSince ? ` · vetted since ${new Date(p.vettedSince).getFullYear()}` : ''}
              </p>
            </article>
          ))}
        </div>
      )}

      <section style={{ marginTop: 44, borderTop: '1px solid #EAE6DC', paddingTop: 24, maxWidth: 620 }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, color: '#1B2733' }}>Becoming a partner</h2>
        <p style={{ fontSize: 13.5, color: '#5C6773', lineHeight: 1.7 }}>
          Partners are vetted for NRCS approval and AAAMSA membership before they receive any
          routed work. If your fabrication business would like to be considered, write to{' '}
          <a href="mailto:partners@besbpo.co.za" style={{ color: '#3E6E91' }}>partners@besbpo.co.za</a>.
        </p>
      </section>
    </main>
  );
}