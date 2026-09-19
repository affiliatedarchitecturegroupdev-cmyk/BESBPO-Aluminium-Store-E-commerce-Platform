import Link from 'next/link';
import { serverFetch } from '../../lib/api';
import type { BlogPost } from '../../lib/content-types';

// Route: /blog — published posts from GET /api/v1/blog (docs/27-content-pages.md).
export default async function Page() {
  const posts = await serverFetch<BlogPost[]>('/blog');

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, color: '#1B2733' }}>Blog</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8 }}>
        Glazing guidance, the CMI model explained, and installation notes.
      </p>

      {(!posts || posts.length === 0) ? (
        <p style={{ marginTop: 28, color: '#5C6773' }}>No posts published yet.</p>
      ) : (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} style={{ display: 'block', padding: 20, border: '1px solid #EAE6DC', borderRadius: 12, textDecoration: 'none', color: '#1B2733' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', margin: 0 }}>{p.title}</h3>
              <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 6 }}>{p.authorName}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}