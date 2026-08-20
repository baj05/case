import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMatterDetail, getMatters, runSearch, databaseReady } from '@/lib/data';
import { Notice } from '@/components/States';
import { ResultCard } from '@/components/ResultCard';

export const dynamic = 'force-dynamic';

const FORUM_KIND_LABEL: Record<string, string> = {
  court: 'Court', tribunal: 'Tribunal', appellate_tribunal: 'Appellate tribunal',
  commission: 'Commission', regulator: 'Regulator', ombudsman: 'Ombudsman',
  authority: 'Authority', grievance_cell: 'Grievance cell', adr: 'Mediation or arbitration',
  police: 'Police', department: 'Government department',
};

export async function generateMetadata({ params }: { params: Promise<{ matter: string }> }): Promise<Metadata> {
  const { matter } = await params;
  if (!databaseReady()) return { title: 'Legal matter' };
  const m = getMatterDetail(matter);
  if (!m) return { title: 'Legal matter' };
  return {
    title: `${m.name} — what it involves and who decides it`,
    description: String(m.plainSummary ?? m.name),
  };
}

export default async function MatterPage({ params }: { params: Promise<{ domain: string; matter: string }> }) {
  const { domain, matter } = await params;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const m = getMatterDetail(matter);
  if (!m) notFound();

  // Professionals who list the practice area this matter belongs to. Nobody is
  // shown as a specialist in the matter itself unless they declared it — the
  // register does not record specialisation, so we do not infer it.
  const outcome = runSearch({ legalMatter: m.slug, perPage: 3, sort: 'verification' });
  const siblings = getMatters({ practiceAreaSlug: m.practiceAreaSlug, limit: 12 })
    .filter((s) => s.slug !== m.slug)
    .slice(0, 6);
  const firstInstance = m.forums.filter((f) => f.stage === 'first_instance');
  const later = m.forums.filter((f) => f.stage !== 'first_instance');

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/matters">Legal matters</Link> / <Link href={`/matters/${domain}`}>{m.domainName}</Link> / {m.name}
      </nav>

      <header className="stack gap-3">
        <div className="row wrap gap-1">
          <span className="chip">{m.practiceAreaName}</span>
          {m.typicalParty && m.typicalParty !== 'any' && <span className="chip chip-outline">Usually the {m.typicalParty}</span>}
          {m.defaultUrgency !== 'normal' && <span className="chip chip-warn">Often time-sensitive</span>}
        </div>
        <h1 className="t-headline-lg">{m.name}</h1>
        {m.plainSummary && <p className="t-body-lg ink-variant measure">{m.plainSummary}</p>}
        <div className="row wrap gap-2">
          <Link href={`/search?legalMatter=${m.slug}`} className="btn btn-primary">Find a professional for this</Link>
          <Link href="/advo-ai" className="btn btn-secondary">Ask Advo AI which advocate fits</Link>
        </div>
      </header>

      <div className="split-2">
        <section className="card stack gap-3" style={{ padding: 22 }}>
          <h2 className="t-title-lg">What is usually at issue</h2>
          <ul className="stack gap-2 list-plain">
            {m.issues.map((i) => (
              <li key={i.slug} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span aria-hidden="true" className="ink-accent">—</span>
                <span className="t-body-sm">{i.name}</span>
              </li>
            ))}
            {m.issues.length === 0 && <li className="t-body-sm ink-variant">Not yet catalogued for this matter.</li>}
          </ul>
        </section>

        <section className="card stack gap-3" style={{ padding: 22 }}>
          <h2 className="t-title-lg">What a lawyer does here</h2>
          <div className="stack gap-2">
            {m.services.map((s) => (
              <div key={s.code} className="stack gap-1">
                <p className="t-title-sm">{s.name}</p>
                <p className="t-body-sm ink-variant">{s.plainSummary}</p>
              </div>
            ))}
            {m.services.length === 0 && <p className="t-body-sm ink-variant">Not yet catalogued for this matter.</p>}
          </div>
        </section>
      </div>

      <section className="stack gap-3">
        <div className="stack gap-1">
          <h2 className="t-title-lg">Where it is heard</h2>
          <p className="t-body-sm ink-variant measure">
            The forum that ordinarily takes a matter like this first, and where it goes if it is not
            resolved. Your own case may follow a different route.
          </p>
        </div>
        <div className="grid-auto-lg">
          {[...firstInstance, ...later].map((f) => (
            <article key={f.code} className="card stack gap-2" style={{ padding: 18 }}>
              <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-label-mono ink-variant">
                  {f.stage === 'first_instance' ? 'Starts here' : 'On appeal or escalation'}
                </span>
                <span className="chip chip-outline">{FORUM_KIND_LABEL[f.kind] ?? f.kind}</span>
              </div>
              <h3 className="t-title">{f.name}</h3>
              {f.statute && <p className="t-body-sm ink-variant">Under the {f.statute}</p>}
              {f.escalatesToName && (
                <p className="t-body-sm">
                  <span className="ink-variant">Escalates to </span>{f.escalatesToName}
                </p>
              )}
              {f.websiteUrl && (
                <a href={f.websiteUrl} className="t-body-sm" target="_blank" rel="noreferrer noopener"
                   style={{ textDecoration: 'underline' }}>Official website</a>
              )}
            </article>
          ))}
          {m.forums.length === 0 && <p className="t-body-sm ink-variant">No forum recorded for this matter yet.</p>}
        </div>
      </section>

      {outcome.hits.length > 0 && (
        <section className="stack gap-3">
          <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="t-title-lg">Professionals listing {m.practiceAreaName}</h2>
            <Link href={`/search?legalMatter=${m.slug}`} className="btn btn-secondary btn-sm">See all {outcome.total}</Link>
          </div>
          <Notice tone="info">
            These professionals list {m.practiceAreaName.toLowerCase()}. The Bar Council
            register does not record specialisation, so nobody is shown as a specialist in this
            specific matter unless they have claimed their profile and declared it.
          </Notice>
          <div className="stack gap-3">
            {outcome.hits.map((hit) => <ResultCard key={hit.professional.id} hit={hit} />)}
          </div>
        </section>
      )}

      {m.synonyms.length > 0 && (
        <section className="stack gap-2">
          <h2 className="t-title">Also described as</h2>
          <div className="row wrap gap-1">
            {m.synonyms.map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip chip-button chip-outline">{s}</Link>
            ))}
          </div>
          <p className="t-body-sm ink-variant">
            Search understands these phrasings — you do not need the legal term.
          </p>
        </section>
      )}

      {siblings.length > 0 && (
        <section className="stack gap-2">
          <h2 className="t-title">Related matters in {m.practiceAreaName}</h2>
          <div className="row wrap gap-1">
            {siblings.map((s) => (
              <Link key={String(s.slug)} href={`/matters/${String(s.domainSlug)}/${String(s.slug)}`} className="chip chip-button">
                {String(s.name)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Notice tone="warn">
        This page describes what a matter of this kind usually involves. It is general information,
        not advice on your case, and no lawyer–client relationship arises from reading it.
      </Notice>
    </div>
  );
}
