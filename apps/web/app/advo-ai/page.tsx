import Link from 'next/link';
import type { Metadata } from 'next';
import { AdvoChat } from '@/components/AdvoChat';
import { Notice } from '@/components/States';
import { getCorpus, getFlags, databaseReady } from '@/lib/data';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Advo AI — describe your matter, get a shortlist',
  description:
    'Describe your legal problem in plain words. Advo AI works out the practice area, jurisdiction '
    + 'and court, then shortlists professionals you can order by fee or experience.',
};

export default function AdvoPage() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> first.
        </Notice>
      </div>
    );
  }
  const corpus = getCorpus();
  const flags = getFlags();

  return (
    <div className="wash">
      <div className="container section-tight stack gap-6">
        <div className="stack gap-3" style={{ maxWidth: '46ch' }}>
          <span className="chip chip-outline" style={{ alignSelf: 'flex-start' }}>
            <span aria-hidden="true" style={{ color: 'var(--action-orange)' }}>◆</span> Advo AI
          </span>
          <h1 className="t-display-lg">
            Describe it once. Get a <span className="hl">shortlist</span>.
          </h1>
          <p className="t-body-lg ink-variant">
            No legal terminology. Advo AI asks the few questions that actually change the answer, then
            narrows {formatNumber(corpus.professionals)} listed professionals down to the ones who can
            act on your matter — ordered however you like.
          </p>
        </div>

        <div className="grid-auto-lg">
          <Notice tone="legal" title="What Advo AI is">
            A deterministic filter over the register. It decides which questions to ask and which
            professionals match. It is explainable — every entry shows why it is on the list.
          </Notice>
          <Notice tone="warn" title="What Advo AI is not">
            It is not a lawyer and it does not give legal advice. It is not a language model, so it
            cannot invent an answer — but it also cannot tell you what to do about your situation.
            Only a qualified professional can.
          </Notice>
        </div>

        {flags.DEMO_DATA_SEEDED && (
          <Notice tone="warn" title="Demo fees are present">
            Fees and availability on some profiles are seeded illustrations so the ordering and
            booking can be tried. The advocates are real Bar Council records; the figures are not
            their own.
          </Notice>
        )}

        <AdvoChat />

        <div className="row wrap gap-2">
          <Link href="/search" className="btn btn-secondary">Prefer to search and filter yourself?</Link>
          <Link href="/how-it-works" className="btn btn-ghost">How ranking works</Link>
        </div>
      </div>
    </div>
  );
}
