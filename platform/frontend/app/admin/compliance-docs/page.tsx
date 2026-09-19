'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isSignedIn } from '@/lib/session';

// Route: /admin/compliance-docs — the regulatory evidence register (AAAMSA, NRCS, SANS).
// Read-only for now: the API's write endpoints are staff-guarded, but attaching a compliance
// document is an evidence action that needs a file-upload surface and a validity-date workflow
// before a form is safe to expose (docs/10-compliance-documents.md).

type ComplianceDoc = {
  id: string;
  standard: string;
  docType: string;
  issuer: string | null;
  fileUrl: string | null;
  validUntil: string | null;
};

export default function Page() {
  const router = useRouter();
  const [docs, setDocs] = useState<ComplianceDoc[] | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    apiFetch<ComplianceDoc[]>('/compliance-docs').then((result) => {
      if (cancelled) return;
      if (result.ok) setDocs(result.data);
      else setDenied(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (denied) {
    return <main style={pageStyle}><p style={{ fontSize: 13.5, color: '#B03A32' }}>This area is for Aluminium Store staff.</p></main>;
  }

  function validity(validUntil: string | null): { text: string; expired: boolean } {
    if (!validUntil) return { text: 'No expiry recorded', expired: false };
    const d = new Date(validUntil);
    const expired = d.getTime() < Date.now();
    return { text: `${expired ? 'Expired' : 'Valid to'} ${d.toLocaleDateString('en-ZA')}`, expired };
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Compliance Documents</h1>
      <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 12, maxWidth: 620 }}>
        Certificates and test evidence supporting the products we sell — AAAMSA performance
        certificates, NRCS approvals and SANS test reports.
      </p>

      {docs === null ? (
        <p style={{ fontSize: 13.5, color: '#A9B2BD', marginTop: 24 }}>Loading documents…</p>
      ) : docs.length === 0 ? (
        <p style={{ fontSize: 13.5, color: '#5C6773', marginTop: 24 }}>No compliance documents on file.</p>
      ) : (
        <table style={{ width: '100%', marginTop: 24, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#A9B2BD', fontWeight: 500 }}>
              <th style={thStyle}>Standard</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Issuer</th>
              <th style={thStyle}>Validity</th>
              <th style={thStyle}>Document</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => {
              const v = validity(doc.validUntil);
              return (
                <tr key={doc.id} style={{ borderTop: '1px solid #EAE6DC' }}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{doc.standard}</td>
                  <td style={{ ...tdStyle, color: '#5C6773' }}>{doc.docType}</td>
                  <td style={{ ...tdStyle, color: '#5C6773' }}>{doc.issuer ?? '—'}</td>
                  <td style={{ ...tdStyle, color: v.expired ? '#B03A32' : '#5C6773' }}>{v.text}</td>
                  <td style={tdStyle}>
                    {doc.fileUrl ? <a href={doc.fileUrl} style={{ color: '#3E6E91' }}>Open</a> : <span style={{ color: '#A9B2BD' }}>Not attached</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 1050, margin: '0 auto', padding: '64px 24px' };
const headingStyle: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, color: '#1B2733', margin: 0 };
const thStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em' };
const tdStyle: React.CSSProperties = { padding: '10px', color: '#1B2733' };