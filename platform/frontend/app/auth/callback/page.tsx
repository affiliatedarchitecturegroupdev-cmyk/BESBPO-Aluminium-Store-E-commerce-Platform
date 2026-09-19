'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/session';

// Route: /auth/callback — landing point for the OAuth providers. The backend redirects here with
// `?token=<jwt>` after exchanging the provider profile; the token is stored and immediately
// stripped from the URL so it does not linger in history or get shared via copy-paste
// (docs/18-authentication-sso.md).
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Sign-in did not complete. Please try again.');
      return;
    }
    setToken(token);
    router.replace('/account');
  }, [params, router]);

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 13.5, color: error ? '#B03A32' : '#5C6773' }}>
        {error ?? 'Completing sign-in…'}
      </p>
      {error && <a href="/login" style={{ color: '#3E6E91', fontSize: 13 }}>Back to sign in</a>}
    </main>
  );
}

// useSearchParams requires a Suspense boundary during static prerender.
export default function Page() {
  return (
    <Suspense fallback={<main style={{ padding: '96px 24px' }} />}>
      <CallbackInner />
    </Suspense>
  );
}