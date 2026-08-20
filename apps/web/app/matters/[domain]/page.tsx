import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDomains, getMatters, databaseReady } from '@/lib/data';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params;
  if (!databaseReady()) return { title: 'Legal matters' };
  const d = getDomains().find((x) => x.slug === domain);
  if (!d) return { title: 'Legal matters' };
  return {
    title: `${d.name} — legal matters`,
    description: `${d.plainSummary} ${d.matterCount} matters, each with the issues involved, the work a lawyer does, and the forum that decides it.`,
  };
}

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const d = getDomains().find((x) => x.slug === domain);
  if (!d) notFound();
  const matters = getMatters({ domainSlug: domain, limit: 500 });

  // Group by practice area so the page reads as a structure, not a flat list.
  const areas = new Map<string, { name: string; slug: string; items: typeof matters }>();
  for (const m of matters) {
    const slug = String(m.practiceAreaSlug);
    const bucket = areas.get(slug) ?? { name: String(m.practiceAreaName), slug, items: [] };
    bucket.items.push(m);
    areas.set(slug, bucket);
  }

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/matters">Legal matters</Link> / {d.name}
      </nav>

      <div className="stack gap-2">
        <h1 className="t-headline-lg">{d.name}</h1>
        <p className="t-body ink-variant measure">{d.plainSummary}</p>
        <p className="t-label-mono ink-variant">{d.matterCount} matters · {areas.size} practice areas</p>
      </div>

      <div className="stack gap-5">
        {[...areas.values()].map((area) => (
          <section key={area.slug} className="stack gap-3">
            <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="t-title-lg">{area.name}</h2>
              <Link href={`/search?practice=${area.slug}`} className="btn btn-secondary btn-sm">Find professionals</Link>
            </div>
            <div className="grid-auto-lg">
              {area.items.map((m) => (
                <Link
                  key={String(m.slug)}
                  href={`/matters/${d.slug}/${m.slug}`}
                  className="card card-hover stack gap-2"
                  style={{ padding: 18 }}
                >
                  <h3 className="t-title">{String(m.name)}</h3>
                  {m.plainSummary && <p className="t-body-sm ink-variant">{String(m.plainSummary)}</p>}
                  <div className="row wrap gap-1 t-label-mono ink-variant">
                    <span>{m.issueCount} issues</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.forumCount} forums</span>
                    {Number(m.resourceCount) > 0 && (<><span aria-hidden="true">·</span><span>{m.resourceCount} resources</span></>)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
