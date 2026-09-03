import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { AdvoOpener } from './AdvoOpener';
import { databaseReady } from '@/lib/data';
import { QuickStartCards } from './QuickStartCards';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Advo AI — Describe Your Legal Matter',
  description:
    'Tell us what happened in your own words. Advo AI identifies the legal area, jurisdiction, and connects you with the right professionals — no legal jargon needed.',
};

export default function AdvoAiLanding() {

  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> first.
        </Notice>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <div
        className="container section"
        style={{
          textAlign: 'center',
          paddingTop: '60px',
          paddingBottom: '40px',
        }}
      >
        <div className="stack gap-4" style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'var(--surface-container)',
              borderRadius: 'var(--r-full)',
              fontSize: '0.875rem',
              color: 'var(--on-surface)',
              fontWeight: 500,
            }}
          >
            ◆ Deterministic filter · not a lawyer
          </div>

          {/* Main Heading */}
          <h1
            className="t-headline-xl"
            style={{
              lineHeight: 1.2,
              marginBottom: '16px',
            }}
          >
            Describe your legal matter
          </h1>

          {/* Subheading */}
          <p
            className="t-body-lg ink-variant"
            style={{
              maxWidth: 600,
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Tell me what happened, in your own words. No legal terms needed. I will work out the area of law, the jurisdiction, and who can help.
          </p>
        </div>
      </div>

      {/* Quick Start Cards */}
      <QuickStartCards />

      {/* Main CTA Section */}
      <div
        className="container"
        style={{
          paddingTop: '40px',
          paddingBottom: '60px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <AdvoOpener />
          <p
            className="t-caption ink-variant"
            style={{
              marginTop: '24px',
            }}
          >
            Advo AI shortlists from our directory of professionals listed on official Bar Council registers. It does not give legal advice, and nothing it says creates a lawyer–client relationship.
          </p>
        </div>
      </div>
    </div>
  );
}
