import Link from 'next/link';
import { serverFetch } from '../../../lib/api';
import type { LegalDocument } from '../../../lib/content-types';

// Route: /legal/[slug] — one page serves all six legal documents (terms, privacy, cookies,
// returns, paia-manual, accessibility), rendering whichever LegalDocument is currently
// published for that slug. Content is pending legal sign-off — this surfaces the model
// honestly rather than inventing policy text (docs/23-legal-tax-compliance.md).
const TITLES: Record<string, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
  returns: 'Returns & Refunds Policy',
  'paia-manual': 'PAIA Manual',
  accessibility: 'Accessibility Statement',
};

export default async function Page({ params }: { params: { slug: string } }) {
  const title = TITLES[params.slug] ?? 'Legal Document';
  const doc = await serverFetch<LegalDocument>(`/legal/${params.slug}`);

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', letterSpacing: '.1em' }}>LEGAL</p>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733' }}>{doc?.title ?? title}</h1>
      {doc?.version && (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#A9B2BD', marginTop: 8 }}>
          VERSION {doc.version}
        </p>
      )}

      {doc ? (
        <article style={{ marginTop: 32, fontSize: 14.5, lineHeight: 1.75, color: '#2A2A2A', whiteSpace: 'pre-wrap' }}>
          {doc.bodyMarkdown}
        </article>
      ) : (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 16 }}>
          This document has not been published yet. It goes live once the current version is
          drafted and signed off by a POPIA-accredited Information Officer and the Group&apos;s
          tax advisor. In the meantime,{' '}
          <Link href="/contact" style={{ color: '#3E6E91' }}>contact us</Link> for a copy.
        </p>
      )}
    </main>
  );
}