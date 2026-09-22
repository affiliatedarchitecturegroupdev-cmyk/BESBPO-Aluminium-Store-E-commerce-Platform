'use client';

import { useEffect } from 'react';
import { getSessionId, getToken } from '../../lib/session';

// Records that this browser viewed a product, which is what feeds "Recently Viewed" and
// "Recommended For You". Rendered once on the PDP with the product's id.
//
// Takes the id rather than the SKU because that is what the analytics stream joins on — the SKU
// is not a foreign key, so logging it would produce rows that can never be resolved back to a
// product.
//
// Fires after mount rather than during render so a server-rendered page does not block on it,
// and failures are swallowed: analytics must never stop a product page from working. The request
// is sent with `keepalive` so a buyer who clicks straight through still has the view recorded.
export default function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const sessionId = getSessionId();
    const token = getToken();
    // One identity is enough; the account is preferred so history follows the buyer across devices
    // (the API takes the user from the bearer token, never from the body).
    if (!sessionId && !token) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const payload: Record<string, string> = { productId };
    if (sessionId) payload.sessionId = sessionId;

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}/analytics/product-view`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Deliberately ignored — a dropped view is not worth surfacing to the shopper.
    });
  }, [productId]);

  return null;
}
