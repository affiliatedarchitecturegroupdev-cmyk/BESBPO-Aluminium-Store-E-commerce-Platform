'use client';

import { useState } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section style={{ background: '#F5F3EE', padding: '56px 32px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, color: '#1B2733' }}>Stay in the loop</h2>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 8 }}>New arrivals, clearance drops, and project features — no spam.</p>
      <form onSubmit={submit} style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22 }}>
        <input
          type="email" required placeholder="you@company.co.za" value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: 999, border: '1px solid #A9B2BD', width: 280 }}
        />
        <button type="submit" style={{ padding: '12px 24px', borderRadius: 999, background: '#C08A4E', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          Subscribe
        </button>
      </form>
      {status === 'sent' && <p style={{ color: '#3E6E91', marginTop: 12, fontSize: 12.5 }}>Subscribed — welcome aboard.</p>}
      {status === 'error' && <p style={{ color: '#B03A32', marginTop: 12, fontSize: 12.5 }}>Something went wrong — try again.</p>}
    </section>
  );
}
