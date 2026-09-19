import Link from 'next/link';
import { serverFetch } from '../../../lib/api';
import type { BlogPost } from '../../../lib/content-types';

// Route: /blog/[slug] — one post; body is a single Markdown/HTML field by design
// (no block editor for what is, in practice, a title/body/author record).
export default async function Page({ params }: { params: { slug: string } }) {
  const post = await serverFetch<BlogPost>(`/blog/${params.slug}`);

  if (!post) {
    return (
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1B2733' }}>Post not found</h1>
        <p style={{ marginTop: 10 }}><Link href="/blog" style={{ color: '#3E6E91' }}>Back to the blog</Link></p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91' }}>{post.slug}</p>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', marginTop: 8 }}>{post.title}</h1>
      <p style={{ fontSize: 12.5, color: '#A9B2BD', marginTop: 8 }}>{post.authorName}</p>
      <article style={{ marginTop: 24, fontSize: 14.5, lineHeight: 1.75, color: '#2A2A2A', whiteSpace: 'pre-wrap' }}>
        {post.body}
      </article>
    </main>
  );
}