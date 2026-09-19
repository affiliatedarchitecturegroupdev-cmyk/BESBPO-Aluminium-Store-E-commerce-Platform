export type ReviewCard = { id: string; rating: number; comment: string; authorName: string; productName: string };

// Real data from GET /api/v1/products/:id/reviews aggregated — illustrative props until wired.
export default function ReviewsCarousel({ reviews }: { reviews: ReviewCard[] }) {
  return (
    <section style={{ padding: '56px 32px', maxWidth: 1240, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, color: '#1B2733' }}>What buyers are saying</h2>
      <div style={{ display: 'flex', gap: 18, overflowX: 'auto', marginTop: 22, paddingBottom: 8 }}>
        {reviews.map((r) => (
          <div key={r.id} style={{ flex: '0 0 300px', background: '#fff', border: '1px solid #EAE6DC', borderRadius: 14, padding: 20 }}>
            <span style={{ color: '#C08A4E', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            <p style={{ fontSize: 13.5, color: '#2A2A2A', marginTop: 10 }}>&ldquo;{r.comment}&rdquo;</p>
            <p style={{ fontSize: 11.5, color: '#A9B2BD', marginTop: 12 }}>{r.authorName} — {r.productName}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
