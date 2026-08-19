import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { getJudges, databaseReady } from '@/lib/data';
import { relativeDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Judges of the Supreme Court of India',
  description:
    'Factual profiles of the sitting judges of the Supreme Court of India — name, designation, '
    + 'parent High Court and tenure, with the source recorded.',
};

export default function JudgesPage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const judges = getJudges();
  const cji = judges.find((j) => (j.designation ?? '').includes('Chief Justice'));

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Courts and judgments</p>
        <h1 className="t-headline-lg">Judges of the Supreme Court of India</h1>
        <p className="t-body ink-variant measure">
          {judges.length} sitting judges. Factual information only — name, designation, the High Court
          they came from, and tenure.
        </p>
      </div>

      <Notice tone="legal" title="There are no ratings here, and there never will be">
        This platform does not rate, score or rank judges, and does not publish sentiment about them.
        Doing so would be both wrong and a contempt risk. The database schema has no column for it —
        adding one would take a migration and a code review.
        {' '}<Link href="/how-it-works" style={{ textDecoration: 'underline' }}>How we handle this</Link>.
      </Notice>

      {cji && (
        <div className="card stack gap-2" style={{ padding: 20, borderLeft: '3px solid var(--primary)' }}>
          <span className="t-label-mono ink-variant">Chief Justice of India</span>
          <h2 className="t-headline-md">{cji.fullName}</h2>
          <div className="row wrap gap-2">
            {cji.tenureStart && <span className="chip chip-outline">Appointed {cji.tenureStart}</span>}
            {cji.tenureEnd && <span className="chip chip-outline">Until {cji.tenureEnd}</span>}
          </div>
        </div>
      )}

      <div className="scroll-x">
        <table className="table" style={{ minWidth: 720 }}>
          <caption className="sr-only">Sitting judges of the Supreme Court of India</caption>
          <thead>
            <tr>
              <th scope="col">Judge</th>
              <th scope="col">Designation</th>
              <th scope="col">Appointed</th>
              <th scope="col">Tenure until</th>
            </tr>
          </thead>
          <tbody>
            {judges.map((j) => (
              <tr key={j.id}>
                <th scope="row" style={{ fontWeight: 600 }}>{j.fullName}</th>
                <td className="ink-variant">{j.designation ?? 'Judge'}</td>
                <td className="ink-variant">{j.tenureStart ?? '—'}</td>
                <td className="ink-variant">{j.tenureEnd ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card stack gap-2" style={{ padding: 18 }}>
        <span className="t-label-mono ink-variant">Provenance</span>
        <p className="t-body-sm">
          Compiled from Wikipedia&apos;s maintained list of sitting Supreme Court judges
          {judges[0]?.lastVerifiedAt && `, last checked ${relativeDate(judges[0].lastVerifiedAt)}`}. A
          community-maintained and cited list, not an official register — we label it that way rather
          than implying more authority than it has.
        </p>
        {judges[0]?.sourceUrl && (
          <a href={judges[0].sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="t-body-sm" style={{ textDecoration: 'underline', wordBreak: 'break-all' }}>
            {judges[0].sourceUrl}
          </a>
        )}
      </div>

      <div className="row wrap gap-2">
        <Link href="/courts" className="btn btn-secondary">Courts and tribunals</Link>
        <Link href="/search" className="btn btn-ghost">Find an advocate</Link>
      </div>
    </div>
  );
}
