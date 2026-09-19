'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /account/addresses — read-only view of saved delivery addresses from GET /auth/me.
// There is no Address create/update endpoint in the API yet, so this page deliberately does not
// offer an "Add address" form that would POST into nothing.

type Address = { id: string; label: string | null; line1: string; city: string; province: string };

export default function Page() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[] | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<{ addresses: Address[] }>('/auth/me').then((result) => {
      if (cancelled) return;
      setAddresses(result.ok ? result.data.addresses : []);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Saved Addresses</h1>

      {addresses === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading addresses…</p>
      ) : addresses.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>
          No saved addresses yet. We confirm delivery details with you when your order is placed.
        </p>
      ) : (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {addresses.map((a) => (
            <div key={a.id} style={cardStyle}>
              {a.label && <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3E6E91', margin: '0 0 8px' }}>{a.label}</p>}
              <p style={{ fontSize: 13.5, color: '#1B2733', margin: 0 }}>{a.line1}</p>
              <p style={{ fontSize: 13, color: '#5C6773', margin: '4px 0 0' }}>{a.city}, {a.province.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const cardStyle: React.CSSProperties = { border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' };