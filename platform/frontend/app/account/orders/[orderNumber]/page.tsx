// Route: /account/orders/[orderNumber]
// Single order status, items, compliance docs, shipment tracking.
export default function Page({ params }: { params: { orderNumber: string } }) {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Order Detail</h1>
      <p>Single order status, items, compliance docs, shipment tracking.</p>
      <p>Param orderNumber: {params.orderNumber}</p>
    </main>
  );
}
