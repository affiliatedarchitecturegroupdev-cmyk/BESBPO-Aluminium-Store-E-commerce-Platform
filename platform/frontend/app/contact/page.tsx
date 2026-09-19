import { siteConfig } from '../../site.config';

export default function Page() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733' }}>Contact Us</h1>
      <p style={{ fontSize: 14, color: '#5C6773', marginTop: 12 }}>
        Email <a href={`mailto:${siteConfig.contactEmail}`} style={{ color: '#3E6E91' }}>{siteConfig.contactEmail}</a>
        {siteConfig.social.whatsapp && (
          <> or <a href={siteConfig.social.whatsapp} style={{ color: '#3E6E91' }}>message us on WhatsApp</a></>
        )}.
      </p>
      <form style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 440 }}>
        <input placeholder="Name" style={{ padding: 12, border: '1px solid #A9B2BD', borderRadius: 8 }} />
        <input placeholder="Email" type="email" style={{ padding: 12, border: '1px solid #A9B2BD', borderRadius: 8 }} />
        <textarea placeholder="Message" rows={5} style={{ padding: 12, border: '1px solid #A9B2BD', borderRadius: 8 }} />
        <button type="submit" style={{ padding: 12, background: '#C08A4E', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          Send Message
        </button>
      </form>
    </main>
  );
}
