import Link from 'next/link';
import type { Metadata } from 'next';
import { getForums, databaseReady } from '@/lib/data';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Forums, tribunals and authorities',
  description:
    'Every forum a legal matter in India can be taken to — courts, tribunals, commissions, regulators, ombudsmen, grievance cells and authorities — with the route each one escalates to.',
};

const GROUPS: Array<{ kind: string; label: string; blurb: string }> = [
  { kind: 'court', label: 'Courts', blurb: 'Ordinary civil and criminal courts, and the constitutional courts above them.' },
  { kind: 'tribunal', label: 'Tribunals', blurb: 'Specialist bodies created by statute for a defined class of dispute.' },
  { kind: 'appellate_tribunal', label: 'Appellate tribunals', blurb: 'Where a tribunal or regulator decision is challenged.' },
  { kind: 'commission', label: 'Commissions', blurb: 'Consumer, human rights, information and similar statutory commissions.' },
  { kind: 'regulator', label: 'Regulators', blurb: 'Sector regulators whose orders are themselves appealable.' },
  { kind: 'ombudsman', label: 'Ombudsmen', blurb: 'Low-cost adjudication for banking, insurance and electricity complaints.' },
  { kind: 'authority', label: 'Authorities and officers', blurb: 'Statutory officers who decide at first instance — registrars, assessing officers, controllers.' },
  { kind: 'grievance_cell', label: 'Grievance cells', blurb: 'The internal step you usually must exhaust before any forum will hear you.' },
  { kind: 'adr', label: 'Mediation and arbitration', blurb: 'Resolution outside the court system, by agreement or by reference.' },
  { kind: 'police', label: 'Police and enforcement', blurb: 'Where a complaint is first registered.' },
  { kind: 'department', label: 'Government departments', blurb: 'Departmental decision-makers and their appellate channels.' },
];

export default function ForumsPage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const all = getForums();

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Browse</p>
        <h1 className="t-headline-lg">Forums, tribunals and authorities</h1>
        <p className="t-body ink-variant measure">
          {all.length} forums a legal matter in India can be taken to, and the route each escalates
          along. Most disputes do not start in a court — they start with a grievance cell, an
          officer or a commission, and reach a court only on appeal.
        </p>
      </div>

      {GROUPS.map((g) => {
        const items = all.filter((f) => f.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <section key={g.kind} className="stack gap-3">
            <div className="stack gap-1">
              <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 className="t-title-lg">{g.label}</h2>
                <span className="t-label-mono ink-variant">{items.length}</span>
              </div>
              <p className="t-body-sm ink-variant measure">{g.blurb}</p>
            </div>
            <div className="grid-auto-lg">
              {items.map((f) => (
                <article key={String(f.code)} className="card stack gap-2" style={{ padding: 18 }}>
                  <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 className="t-title-sm">{String(f.name)}</h3>
                    {f.shortName && <span className="t-label-mono ink-variant">{String(f.shortName)}</span>}
                  </div>
                  {f.statute && <p className="t-body-sm ink-variant">{String(f.statute)}</p>}
                  <div className="row wrap gap-1">
                    <span className="chip chip-outline">{String(f.level)}</span>
                    {Number(f.matterCount) > 0 && <span className="chip chip-outline">{f.matterCount} matters</span>}
                  </div>
                  {f.escalatesToName && (
                    <p className="t-body-sm"><span className="ink-variant">Appeal lies to </span>{String(f.escalatesToName)}</p>
                  )}
                  {f.websiteUrl && (
                    <a href={String(f.websiteUrl)} target="_blank" rel="noreferrer noopener" className="t-body-sm" style={{ textDecoration: 'underline' }}>
                      Official website
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <Notice tone="info">
        Jurisdiction depends on the facts, the amount and the statute involved. This is a map of the
        system, not a determination about your case. <Link href="/matters" style={{ textDecoration: 'underline' }}>Browse by legal matter</Link>.
      </Notice>
    </div>
  );
}
