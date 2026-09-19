'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearToken, isSignedIn } from '@/lib/session';

// Route: /account — buyer account dashboard. Reads GET /auth/me, which returns the user with
// their company (and trade account, if any) and saved addresses. The header renders only what
// the API actually holds, so an account with no company does not show an empty trade block.

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: { name: string; tradeAccount: { approved: boolean; discountTier: string; creditLimit: string | null } | null } | null;
  addresses: { id: string; label: string | null; line1: string; city: string; province: string }[];
  authProviders: { provider: string }[];
};

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Profile>('/auth/me').then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        if (result.status === 401) {
          clearToken();
          router.push('/login');
        }
        return;
      }
      setProfile(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function signOut() {
    clearToken();
    router.push('/');
  }

  if (loading) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#A9B2BD' }}>Loading your account…</p></main>;
  }
  if (!profile) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#B03A32' }}>We could not load your account.</p></main>;
  }

  const trade = profile.company?.tradeAccount;

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Welcome back, {profile.name.split(' ')[0]}</h1>
      <p style={{ fontSize: 13, color: '#A9B2BD', marginTop: 6 }}>{profile.email}</p>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <a href="/account/orders" style={cardStyle}>
          <h2 style={cardHeadingStyle}>Orders</h2>
          <p style={cardBodyStyle}>Track and review past orders.</p>
        </a>
        <a href="/account/addresses" style={cardStyle}>
          <h2 style={cardHeadingStyle}>Saved Addresses</h2>
          <p style={cardBodyStyle}>{profile.addresses.length} address{profile.addresses.length === 1 ? '' : 'es'} on file.</p>
        </a>
        <a href="/account/trade" style={cardStyle}>
          <h2 style={cardHeadingStyle}>Trade Account</h2>
          <p style={cardBodyStyle}>
            {trade
              ? trade.approved
                ? `Approved — ${trade.discountTier} pricing`
                : 'Application under review'
              : 'Apply for trade pricing'}
          </p>
        </a>
      </div>

      <button onClick={signOut} style={{ marginTop: 32, padding: '10px 22px', background: 'transparent', border: '1.5px solid #A9B2BD', borderRadius: 999, cursor: 'pointer', fontSize: 13 }}>
        Sign out
      </button>
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const cardStyle: React.CSSProperties = { border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff', textDecoration: 'none', display: 'block' };
const cardHeadingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, color: '#1B2733', margin: '0 0 6px' };
const cardBodyStyle: React.CSSProperties = { fontSize: 13, color: '#5C6773', margin: 0 };