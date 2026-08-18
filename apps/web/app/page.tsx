import Link from 'next/link';
import Image from 'next/image';
import { SearchInput } from '@/components/SearchInput';
import { Notice } from '@/components/States';
import { getCorpus, getPracticeAreas, getCourts, getBarCouncils, databaseReady } from '@/lib/data';
import { formatNumber, relativeDate, searchHref } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Example queries. Each is a real sentence a user might type, and each is
 *  routed by the deterministic classifier — nothing here is a canned result. */
const EXAMPLES = [
  'Labour lawyer for a PF dispute',
  'Advocate for Jabalpur High Court',
  'My landlord is not returning my deposit',
  'Corporate lawyer in Mumbai',
  'Senior advocate, Delhi High Court',
];

const PRACTICE_IMAGE: Record<string, string> = {
  LABOUR: '/img/editorial/pa-labour.jpg',
  CORPORATE: '/img/editorial/pa-corporate.jpg',
  FAMILY: '/img/editorial/pa-family.jpg',
  PROPERTY: '/img/editorial/pa-property.jpg',
  CRIMINAL: '/img/editorial/pa-criminal.jpg',
  TAX: '/img/editorial/pa-tax.jpg',
  IP: '/img/editorial/pa-ip.jpg',
  TECH: '/img/editorial/pa-tech.jpg',
  ARBITRATION: '/img/editorial/pa-arbitration.jpg',
  CONSUMER: '/img/editorial/pa-consumer.jpg',
  BANKING: '/img/editorial/pa-banking.jpg',
  CIVIL: '/img/editorial/court-building.jpg',
};

export default function HomePage() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> from the project root to build the local
          database, then reload this page.
        </Notice>
      </div>
    );
  }

  const corpus = getCorpus();
  const areas = getPracticeAreas();
  const highCourts = getCourts(2).filter((c) => c.isBench === 0);
  const councils = getBarCouncils();

  // Top-level areas only for the browse grid; children appear on the area page.
  const topAreas = areas.filter((a) => a.parentId === null).slice(0, 12);

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="hero">
        <div className="container stack gap-6" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p className="t-label-mono ink-variant">
            {formatNumber(corpus.bodies)} Bar Councils · {formatNumber(corpus.professionals)} records · {formatNumber(corpus.courts)} courts
          </p>

          <h1 className="t-display-xl measure" style={{ maxWidth: '20ch' }}>
            Find the right legal professional for <span className="hl">your matter</span>.
          </h1>

          <p className="t-body-lg ink-variant measure-tight">
            Describe the problem in your own words. No legal terminology needed — we work out the
            practice area, jurisdiction and court for you.
          </p>

          <div className="full" style={{ maxWidth: 720 }}>
            <SearchInput autoFocus />
          </div>

          <div className="row wrap gap-2" style={{ justifyContent: 'center' }}>
            {EXAMPLES.map((ex) => (
              <Link key={ex} href={`/search?q=${encodeURIComponent(ex)}`} className="chip chip-button chip-outline">
                {ex}
              </Link>
            ))}
          </div>

          {/* Real, computed corpus figures. No borrowed social proof. */}
          <div className="stat-strip glass" style={{ padding: '18px 24px', justifyContent: 'center' }}>
            <div className="stat">
              <span className="stat-num">{formatNumber(corpus.professionals)}</span>
              <span className="stat-label">Listed from official registers</span>
            </div>
            <div className="stat">
              <span className="stat-num">{formatNumber(corpus.bodies)}</span>
              <span className="stat-label">State Bar Councils covered</span>
            </div>
            <div className="stat">
              <span className="stat-num">{formatNumber(corpus.highCourts)}</span>
              <span className="stat-label">High Courts mapped</span>
            </div>
            <div className="stat">
              <span className="stat-num">{corpus.lastIngestAt ? relativeDate(corpus.lastIngestAt) : '—'}</span>
              <span className="stat-label">Register last checked</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- transparency */}
      <section className="container section-tight">
        <div className="grid-auto-lg">
          <Notice tone="legal" title="Every listing is traceable">
            Records are compiled from Bar Council of India State Bar Council registers. Each profile
            shows its source, the date it was captured, and what has been independently verified.
            {' '}<Link href="/data-sources" style={{ textDecoration: 'underline' }}>See our data sources</Link>.
          </Notice>
          <Notice tone="legal" title="Ranking cannot be bought">
            Results are ordered by practice relevance, jurisdiction, court, verification and
            availability — never by payment. Every result shows its own score breakdown.
            {' '}<Link href="/how-it-works" style={{ textDecoration: 'underline' }}>How ranking works</Link>.
          </Notice>
        </div>
      </section>

      {/* -------------------------------------------------------- practice areas */}
      <section className="container section">
        <div className="stack gap-6">
          <div className="stack gap-2">
            <p className="t-label-mono ink-variant">Browse by area</p>
            <h2 className="t-headline-lg" style={{ maxWidth: '24ch' }}>
              Start from the kind of problem you have.
            </h2>
            <p className="t-body ink-variant measure">
              Each area is described in plain language, with the specialisations beneath it.
            </p>
          </div>

          <div className="grid-auto">
            {topAreas.map((area) => {
              const img = PRACTICE_IMAGE[area.code];
              return (
                <Link key={area.id} href={searchHref({ practice: area.slug })} className="media-card">
                  {img ? (
                    <Image src={img} alt="" width={480} height={360} sizes="(max-width: 700px) 100vw, 320px" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  ) : (
                    <span style={{ display: 'block', width: '100%', height: '100%', background: 'var(--surface-high)' }} />
                  )}
                  <span className="media-card-arrow" aria-hidden="true">↗</span>
                  <span className="media-card-overlay">
                    <span className="t-title" style={{ color: '#fff' }}>{area.name}</span>
                    <span className="t-caption clamp-2" style={{ color: 'rgba(255,255,255,0.86)' }}>{area.plainSummary}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <Link href="/practice-areas" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
            All {areas.length} practice areas
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------------- courts */}
      <section className="container section-tight">
        <div className="card stack gap-4" style={{ padding: 'clamp(20px, 4vw, 36px)' }}>
          <div className="row wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="stack gap-2">
              <p className="t-label-mono ink-variant">By jurisdiction</p>
              <h2 className="t-headline-md">Search by the court that will hear your matter.</h2>
            </div>
            <Link href="/courts" className="btn btn-secondary btn-sm">All courts and tribunals</Link>
          </div>
          <div className="row wrap gap-2">
            {highCourts.slice(0, 14).map((court) => (
              <Link key={court.id} href={searchHref({ court: court.slug })} className="chip chip-button">
                {court.shortName ?? court.name}
                {court.professionalCount > 0 && <span className="mono ink-variant">{court.professionalCount}</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- bar councils */}
      <section className="container section">
        <div className="stack gap-6">
          <div className="stack gap-2">
            <p className="t-label-mono ink-variant">Source of record</p>
            <h2 className="t-headline-lg" style={{ maxWidth: '26ch' }}>
              Built on the <span className="hl">official Bar Council registers</span>.
            </h2>
            <p className="t-body ink-variant measure">
              We ingest the Bar Council of India&apos;s State Bar Council directory, respecting its
              robots policy and rate limits, and record the provenance of every field.
            </p>
          </div>

          <div className="scroll-x">
            <table className="table" style={{ minWidth: 640 }}>
              <caption className="sr-only">State Bar Councils and the number of records ingested from each</caption>
              <thead>
                <tr>
                  <th scope="col">State Bar Council</th>
                  <th scope="col">Jurisdiction</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Records</th>
                  <th scope="col">Checked</th>
                </tr>
              </thead>
              <tbody>
                {councils.slice(0, 10).map((c) => (
                  <tr key={c.id}>
                    <th scope="row" style={{ fontWeight: 600 }}>
                      <Link href={`/search?q=${encodeURIComponent(c.name)}`} style={{ textDecoration: 'underline' }}>
                        {c.name}
                      </Link>
                    </th>
                    <td className="ink-variant">{c.jurisdictionName ?? '—'}</td>
                    <td className="num">{formatNumber(c.recordCount)}</td>
                    <td className="ink-variant">{relativeDate(c.lastVerifiedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link href="/bar-councils" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
            All {councils.length} State Bar Councils
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- for professionals */}
      <section className="container section-tight">
        <div
          className="stack gap-4"
          style={{
            padding: 'clamp(24px, 5vw, 48px)',
            borderRadius: 'var(--r-xl)',
            background: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
          }}
        >
          <p className="t-label-mono">For advocates and firms</p>
          <h2 className="t-headline-lg" style={{ maxWidth: '26ch' }}>Is one of these profiles yours?</h2>
          <p className="t-body measure" style={{ maxWidth: '58ch' }}>
            Claim it to confirm your details, set out your practice areas and courts, choose whether
            you accept consultation requests, and control what appears. Claiming is free, and we
            never charge for placement or ranking.
          </p>
          <div className="row wrap gap-2">
            <Link href="/for-professionals" className="btn btn-navy">Claim your profile</Link>
            <Link href="/legal/data-request" className="btn btn-secondary">Request a correction or removal</Link>
          </div>
        </div>
      </section>
    </>
  );
}
