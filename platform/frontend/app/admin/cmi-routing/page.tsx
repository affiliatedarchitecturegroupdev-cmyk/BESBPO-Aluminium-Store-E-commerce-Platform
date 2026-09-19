'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin/cmi-routing — staff view of the partner network used to assign routed work.
// Reads GET /cmi-routing/partners (public, so no role gate) but the confirm action it links
// to is ADMIN/STAFF-only on the API. Partner capacity is shown here because staff need it to
// make the assignment decision; the public /cmi-partners page deliberately omits it.
//
// The doc's rule is "routing suggests, a human approves", so nothing on this page auto-assigns.

type Partner = {
  id: string;
  name: string;
  province: string;
  capabilities: string[];
  nrcsApproved: boolean;
  aaamsaMember: boolean;
};

export default function Page() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[] | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<Partner[]>('/cmi-routing/partners').then((result) => {
      if (cancelled) return;
      if (result.ok) setPartners(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>CMI Partner Routing</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 12, maxWidth: 620, lineHeight: 1.7 }}>
        Large curtain-walling, shopfront and structural-glazing orders that exceed hub capacity
        are routed to this network. A partner assignment is suggested by capability and province
        match, then confirmed by a staff member — routing never auto-assigns.
      </p>

      {partners === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading partner network…</p>
      ) : partners.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>No active partners on the network.</p>
      ) : (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {partners.map((p) => (
            <div key={p.id} style={{ border: '1px solid #EAE6DC', borderRadius: 12, padding: 20, background: '#fff' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1B2733', margin: 0 }}>{p.name}</p>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: '#3E6E91', margin: '6px 0 10px' }}>
                {p.province.replace(/_/g, ' ')}
              </p>
              <p style={{ fontSize: 12.5, color: '#5C6773', margin: 0 }}>
                {p.capabilities.length > 0 ? p.capabilities.join(' · ') : 'General fabrication'}
              </p>
              <p style={{ fontSize: 11.5, color: '#A9B2BD', margin: '10px 0 0' }}>
                {p.nrcsApproved ? 'NRCS-approved' : 'NRCS pending'}{p.aaamsaMember ? ' · AAAMSA member' : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#A9B2BD', marginTop: 32, maxWidth: 620 }}>
        {/* TODO(phase-2): surface routed orders awaiting assignment here and wire the
            "confirm partner" action to POST /cmi-routing/:orderId/confirm/:partnerId. Needs
            the router-job that flags orders ROUTED_TO_CMI_PARTNER to exist first, plus a
            staff-visible list of unassigned routed orders (docs/06-cmi-partner-routing.md). */}
        Assignment confirmation is enabled once the routing job and routed-order queue land in Phase 2.
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 1050, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };