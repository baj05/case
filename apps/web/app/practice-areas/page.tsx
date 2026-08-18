import Link from 'next/link';
import type { Metadata } from 'next';
import { getPracticeAreas, databaseReady } from '@/lib/data';
import { searchHref } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Practice areas',
  description: 'Every area of law covered, described in plain language, with the specialisations beneath each.',
};

export default function PracticeAreasPage() {
  if (!databaseReady()) return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  const areas = getPracticeAreas();
  const parents = areas.filter((a) => a.parentId === null);

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Browse</p>
        <h1 className="t-headline-lg">Practice areas</h1>
        <p className="t-body ink-variant measure">
          Described the way a non-lawyer would describe the problem. Search understands the plain
          language too — you do not need the legal term.
        </p>
      </div>

      <div className="grid-auto-lg">
        {parents.map((parent) => {
          const children = areas.filter((a) => a.parentId === parent.id);
          return (
            <section key={parent.id} className="card stack gap-3" style={{ padding: 20 }}>
              <div className="stack gap-2">
                <h2 className="t-title">
                  <Link href={searchHref({ practice: parent.slug })} style={{ textDecoration: 'underline' }}>{parent.name}</Link>
                </h2>
                <p className="t-body-sm ink-variant">{parent.plainSummary}</p>
              </div>
              {children.length > 0 && (
                <div className="row wrap gap-1">
                  {children.map((c) => (
                    <Link key={c.id} href={searchHref({ practice: c.slug })} className="chip chip-button chip-outline">
                      {c.name}{c.professionalCount > 0 && <span className="mono">{c.professionalCount}</span>}
                    </Link>
                  ))}
                </div>
              )}
              <Link href={searchHref({ practice: parent.slug })} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
                Find professionals
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
