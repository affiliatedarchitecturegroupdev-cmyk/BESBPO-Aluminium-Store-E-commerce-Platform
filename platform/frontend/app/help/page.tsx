import Link from 'next/link';
import { serverFetch } from '../../lib/api';
import type { FaqItem } from '../../lib/content-types';

// Route: /help — Help Center / FAQ, grouped by category. This content also seeds the AI
// agent's knowledge base (docs/27-content-pages.md, docs/30-ai-support-agent.md).
export default async function Page({ searchParams }: { searchParams: { category?: string } }) {
  const query = searchParams.category ? `?category=${encodeURIComponent(searchParams.category)}` : '';
  const items = await serverFetch<FaqItem[]>(`/faq${query}`);

  const grouped = new Map<string, FaqItem[]>();
  for (const item of items ?? []) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }
  const categories = Array.from(grouped.keys()).sort();

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733' }}>Help Center</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 10 }}>
        Browse by topic, or ask the assistant in the corner — it escalates to a person when it should.
      </p>

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
          <Link href="/help" style={pill(searchParams.category == null)}>All</Link>
          {categories.map((c) => (
            <Link key={c} href={`/help?category=${encodeURIComponent(c)}`} style={pill(searchParams.category === c)}>{c}</Link>
          ))}
        </div>
      )}

      {(!items || items.length === 0) && (
        <p style={{ marginTop: 24, color: '#5C6773' }}>
          No FAQ entries published yet. Once staff publish answers here they become the first
          content source the support agent draws on.
        </p>
      )}

      {categories.map((category) => (
        <section key={category} style={{ marginTop: 32 }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', letterSpacing: '.08em' }}>
            {category.toUpperCase()}
          </p>
          {grouped.get(category)!.map((f) => (
            <details key={f.id} style={{ borderBottom: '1px solid #EAE6DC', padding: '14px 0' }}>
              <summary style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{f.question}</summary>
              <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 10 }}>{f.answer}</p>
            </details>
          ))}
        </section>
      ))}
    </main>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 999, fontSize: 12.5, textDecoration: 'none',
    background: active ? '#1B2733' : '#fff', color: active ? '#fff' : '#1B2733',
    border: '1px solid ' + (active ? '#1B2733' : '#EAE6DC'),
  };
}