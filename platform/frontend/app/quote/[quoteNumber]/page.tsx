// Route: /quote/[quoteNumber]
// View a submitted quote's status and items.
export default function Page({ params }: { params: { quoteNumber: string } }) {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Quote Detail</h1>
      <p>View a submitted quote's status and items.</p>
      <p>Param quoteNumber: {params.quoteNumber}</p>
    </main>
  );
}
