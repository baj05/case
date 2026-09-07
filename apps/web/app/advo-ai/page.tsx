import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { databaseReady } from '@/lib/data';
import { AdvoAIExperience } from './AdvoAIExperience';

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
    <div className="container section stack gap-6">
      <div className="stack gap-3" style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: 'var(--surface-container)',
            borderRadius: 'var(--r-full)',
            fontSize: '0.875rem',
            fontWeight: 500,
            alignSelf: 'center',
          }}
        >
          ◆ Deterministic filter · not a lawyer
        </div>
        <h1 className="t-headline-lg">Describe your legal matter</h1>
        <p className="t-body-lg ink-variant">
          Tell me what happened, in your own words. No legal terms needed. I will work out the
          area of law, the jurisdiction, and who can help.
        </p>
      </div>

      <AdvoAIExperience />

      <Notice tone="info">
        Advo AI shortlists from our directory of professionals listed on official Bar Council
        registers and public case records. It does not represent them, cannot receive money on their
        behalf, and never ranks paid entries higher than unpaid ones.
      </Notice>
    </div>
  );
}
