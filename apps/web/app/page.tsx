import Link from 'next/link';
import Image from 'next/image';
import { SearchInput } from '@/components/SearchInput';
import { Notice } from '@/components/States';
import { getCorpus, getPracticeAreas, getCourts, getBarCouncils, databaseReady } from '@/lib/data';
import { formatNumber, relativeDate, searchHref } from '@/lib/format';

export const dynamic = 'force-dynamic';

const EXAMPLES = [
  'Labour lawyer for a PF dispute',
  'Advocate for Jabalpur High Court',
  'My landlord is not returning my deposit',
  'Corporate lawyer in Mumbai',
];

/** Editorial imagery per practice area, all openly licensed — see /credits. */
const PA_IMAGE: Record<string, string> = {
  LABOUR: '/img/editorial/pa-labour.jpg',
  CORPORATE: '/img/editorial/pa-corporate.jpg',
  PROPERTY: '/img/editorial/pa-property.jpg',
  FAMILY: '/img/editorial/pa-family.jpg',
  CRIMINAL: '/img/editorial/pa-criminal.jpg',
  TAX: '/img/editorial/pa-tax.jpg',
  IP: '/img/editorial/pa-ip.jpg',
  TECH: '/img/editorial/pa-tech.jpg',
  ARBITRATION: '/img/editorial/pa-arbitration.jpg',
  CONSUMER: '/img/editorial/pa-consumer.jpg',
  BANKING: '/img/editorial/pa-banking.jpg',
  CIVIL: '/img/courts/court-bombay-hc.jpg',
  CONSTITUTIONAL: '/img/courts/court-calcutta-hc.jpg',
  ADMIN_SERVICE: '/img/courts/court-punjab-hc.jpg',
  ARBITRATION_ALT: '/img/courts/interior-chamber.jpg',
  INSOLVENCY: '/img/courts/court-karnataka-hc.jpg',
};

export default function HomePage() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> from the project root, then reload.
        </Notice>
      </div>
    );
  }

  const corpus = getCorpus();
  const areas = getPracticeAreas();
  const highCourts = getCourts(2).filter((c) => c.isBench === 0);
  const councils = getBarCouncils();
  const topAreas = areas.filter((a) => a.parentId === null);

  // Real ingestion coverage, expressed as the kit's segmented bar.
  const coverageSegments = 24;
  const councilsWithRecords = councils.filter((c) => c.recordCount > 0).length;

  return (
    <>
      {/* ==================================================== HERO (split) */}
      <section className="wash section-tight">
        <div className="container hero-split">
          <div className="stack gap-5">
            <span className="chip chip-outline" style={{ alignSelf: 'flex-start' }}>
              <span aria-hidden="true" style={{ color: 'var(--action-orange)' }}>●</span>
              Built on official Bar Council registers
            </span>

            <h1 className="t-display-xl" style={{ maxWidth: '17ch' }}>
              Find the right advocate for <span className="hl">your matter</span>.
            </h1>

            <p className="t-body-lg ink-variant measure-tight">
              Describe the problem in your own words. We work out the practice area, the jurisdiction
              and the court — no legal terminology needed.
            </p>

            <div className="row wrap gap-4">
              <Link href="/search" className="btn btn-navy btn-pill btn-lg">Start a search</Link>
              <div className="row gap-3">
                <span className="avatar-cluster" aria-hidden="true">
                  <span className="mono-av">BCI</span>
                  <span className="mono-av" style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>SC</span>
                  <span className="mono-av" style={{ background: 'var(--electric-lime)', color: 'var(--on-lime)' }}>HC</span>
                  <span className="mono-av" style={{ background: 'var(--surface-highest)', color: 'var(--on-surface)' }}>+{corpus.courts - 3}</span>
                </span>
                <span className="stack" style={{ gap: 0 }}>
                  <strong style={{ fontFamily: 'var(--font-display)' }}>{formatNumber(corpus.courts)} courts</strong>
                  <span className="t-caption">mapped across {corpus.states} states and UTs</span>
                </span>
              </div>
            </div>
          </div>

          {/* Photo stage with floating real-data cards — the reference kit's
              hero composition, using a photograph of an actual court this
              platform indexes rather than a stock figure. */}
          <div className="photo-stage">
            <Image
              src="/img/courts/hero-madras-hc-towers.jpg"
              alt="The Madras High Court, Chennai"
              width={1120}
              height={1400}
              priority
              sizes="(max-width: 940px) 92vw, 520px"
              className="photo-stage-img"
            />
            <span className="photo-stage-caption">Madras High Court, Chennai</span>

            <div className="float-card float-tl">
              <span className="float-label">Register coverage</span>
              <span className="float-value">{councilsWithRecords}/{corpus.bodies}</span>
              <span className="t-caption">State Bar Councils ingested</span>
              <span className="seg-bar" aria-hidden="true">
                {Array.from({ length: coverageSegments }, (_, i) => (
                  <span key={i} className="seg" data-on={i < councilsWithRecords} />
                ))}
              </span>
            </div>

            <div className="float-card float-br">
              <span className="row gap-2" style={{ marginBottom: 4 }}>
                <span className="verif verif-3" style={{ fontSize: '0.6875rem' }}>
                  <span aria-hidden="true">✓</span> Traceable
                </span>
              </span>
              <span className="float-label">Records published</span>
              <span className="float-value">{formatNumber(corpus.professionals)}</span>
              <span className="t-caption">each with source, capture date and last check</span>
            </div>

            <div className="float-card float-ml" style={{ maxWidth: 186 }}>
              <span className="float-label">Register checked</span>
              <span className="float-value" style={{ fontSize: '1.0625rem' }}>
                {corpus.lastIngestAt ? relativeDate(corpus.lastIngestAt) : '—'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= SEARCH (the product) */}
      <section className="container" style={{ marginTop: 8 }}>
        <div className="glass stack gap-3" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
          <SearchInput />
          <div className="row wrap gap-2">
            <span className="t-caption" style={{ alignSelf: 'center' }}>Try</span>
            {EXAMPLES.map((ex) => (
              <Link key={ex} href={`/search?q=${encodeURIComponent(ex)}`} className="chip chip-button chip-outline">
                {ex}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= STAT BAND */}
      <section className="container section-tight">
        <div className="stat-band">
          {[
            [formatNumber(corpus.professionals), 'Advocates listed from official registers'],
            [String(corpus.bodies), 'State Bar Councils covered'],
            [String(corpus.highCourts), 'High Courts mapped, with their benches'],
            [String(corpus.practiceAreas), 'Practice areas in plain language'],
          ].map(([num, label]) => (
            <div key={label}>
              <div className="stat-band-num">{num}</div>
              <div className="stat-band-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================ BROWSE BY CATEGORY */}
      <section className="container section">
        <div className="stack gap-6">
          <div className="row wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="stack gap-2">
              <p className="t-label-mono ink-variant">Browse by area</p>
              <h2 className="t-headline-lg" style={{ maxWidth: '22ch' }}>
                Start from the kind of problem you have.
              </h2>
            </div>
            <Link href="/practice-areas" className="btn btn-secondary btn-pill">All {areas.length} areas</Link>
          </div>

          <div className="cat-grid">
            {topAreas.slice(0, 8).map((area, i) => {
              const img = PA_IMAGE[area.code] ?? '/img/courts/court-madras-hc.jpg';
              // Vary the tiles so the grid reads like the reference collage.
              const span = i === 0 ? 'span-2row' : i === 3 ? 'span-2col' : '';
              return (
                <Link
                  key={area.id}
                  href={searchHref({ practice: area.slug })}
                  className={`media-card ${span} ${i === 0 ? 'cat-tall' : 'cat-wide'}`}
                >
                  <Image
                    src={img}
                    alt=""
                    width={640}
                    height={480}
                    sizes="(max-width: 900px) 100vw, 33vw"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                  <span className="media-card-arrow" aria-hidden="true">↗</span>
                  <span className="media-card-overlay">
                    <span className="t-title" style={{ color: '#fff' }}>{area.name}</span>
                    <span className="t-caption clamp-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {area.plainSummary}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= STATEMENT */}
      <section className="container section-tight">
        <div className="grid-auto-lg" style={{ alignItems: 'center' }}>
          <div className="stack gap-4">
            <span className="chip chip-outline" style={{ alignSelf: 'flex-start' }}>Our position</span>
            <p className="statement">
              We publish what the register says, name our source, and let you see exactly why a result
              ranked where it did.
            </p>
            <p className="t-body ink-variant measure">
              No paid placement, no invented ratings, no fabricated credentials. Where the register is
              silent, the profile says so rather than guessing.
            </p>
            <Link href="/how-it-works" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
              How ranking works
            </Link>
          </div>

          <div className="block-orange">
            <span className="t-label-mono">Why you can check us</span>
            <div className="inner-card stack gap-1">
              <strong>Every field is attributable</strong>
              <span className="t-body-sm ink-variant">
                Source, source URL, capture date and last-checked date on every record.
              </span>
            </div>
            <div className="inner-card stack gap-1">
              <strong>Ranking cannot be bought</strong>
              <span className="t-body-sm ink-variant">
                The weights are published. The column that would carry a paid boost is constrained to
                zero in the database.
              </span>
            </div>
            <div className="inner-card stack gap-1">
              <strong>Personal contact details are withheld</strong>
              <span className="t-body-sm ink-variant">
                Residential addresses and personal numbers in the register are never republished.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= STEPS */}
      <section className="container section">
        <div className="stack gap-6">
          <div className="stack gap-2">
            <p className="t-label-mono ink-variant">How it works</p>
            <h2 className="t-headline-lg" style={{ maxWidth: '24ch' }}>
              Four steps, and you can stop at any of them.
            </h2>
          </div>
          <div className="step-row">
            {[
              ['step-navy', 'Step 01', 'Describe it plainly', 'Type what happened in your own words. Our classifier maps it to a practice area, a jurisdiction and a court, and shows you what it concluded.'],
              ['step-blue', 'Step 02', 'Compare on the facts', 'Every result shows what is verified, what is self-declared, and its full match-score breakdown.'],
              ['step-peach', 'Step 03', 'Send an enquiry', 'A structured brief goes to the professional. No fee passes through us, and no lawyer–client relationship is created by asking.'],
              ['step-lime', 'Step 04', 'They decide, and so do you', 'The professional accepts or declines and sets their own fee with you directly.'],
            ].map(([tone, kicker, title, body]) => (
              <div key={kicker} className={`step-card ${tone}`}>
                <span className="step-kicker">{kicker}</span>
                <span className="step-title">{title}</span>
                <span className="t-body-sm" style={{ opacity: 0.92 }}>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ COURTS */}
      <section className="container section-tight">
        <div className="card stack gap-4" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
          <div className="row wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="stack gap-2">
              <p className="t-label-mono ink-variant">By jurisdiction</p>
              <h2 className="t-headline-md">Search by the court that will hear it.</h2>
            </div>
            <Link href="/courts" className="btn btn-secondary btn-sm btn-pill">All courts and tribunals</Link>
          </div>
          <div className="row wrap gap-2">
            {highCourts.slice(0, 16).map((court) => (
              <Link key={court.id} href={searchHref({ court: court.slug })} className="chip chip-button">
                {court.shortName ?? court.name}
                {court.professionalCount > 0 && <span className="mono ink-variant">{court.professionalCount}</span>}
              </Link>
            ))}
          </div>
          <div className="authority-strip" style={{ borderTop: '1px solid var(--outline-variant)', marginTop: 4 }}>
            {['Supreme Court of India', 'High Courts', 'District Judiciary', 'Tribunals', 'Consumer Commissions', 'Arbitral Institutions'].map((a) => (
              <span key={a} className="authority-item">
                <span aria-hidden="true" style={{ color: 'var(--action-orange)' }}>◆</span>{a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================== FOR LAWYERS */}
      <section className="container section">
        <div className="stack gap-6">
          <div className="stack gap-2">
            <p className="t-label-mono ink-variant">For advocates and firms</p>
            <h2 className="t-headline-lg" style={{ maxWidth: '24ch' }}>
              Claiming your profile is <span className="hl">free</span>, and always will be.
            </h2>
            <p className="t-body ink-variant measure">
              We do not sell placement. These tiers differ by the tooling they give you, never by how
              visible you are in search.
            </p>
          </div>

          <div className="plan-grid">
            <div className="plan">
              <span className="plan-name">Listed</span>
              <span className="t-caption">Every advocate in the register, automatically</span>
              <span className="plan-price">Free</span>
              <ul className="plan-list">
                {['Profile compiled from the official register', 'Full source attribution and freshness dates', 'Correction and removal on request', 'Appears in search on relevance alone'].map((f) => (
                  <li key={f}><span className="plan-tick" aria-hidden="true">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/search" className="btn btn-secondary btn-block" style={{ marginTop: 'auto' }}>Find your profile</Link>
            </div>

            <div className="plan plan-featured">
              <span className="row gap-2" style={{ justifyContent: 'space-between' }}>
                <span className="plan-name">Claimed</span>
                <span className="chip chip-lime">Recommended</span>
              </span>
              <span className="t-caption">Verified, and under your control</span>
              <span className="plan-price">Free</span>
              <ul className="plan-list">
                {['Everything in Listed', 'Confirm and correct your details', 'State your practice areas and courts', 'Bar enrolment verification', 'Choose whether you accept enquiries', 'Set your own fees, collected directly'].map((f) => (
                  <li key={f}><span className="plan-tick" aria-hidden="true">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/for-professionals" className="btn btn-primary btn-block" style={{ marginTop: 'auto' }}>Claim your profile</Link>
            </div>

            <div className="plan">
              <span className="plan-name">Chambers &amp; firms</span>
              <span className="t-caption">Practice tooling, not visibility</span>
              <span className="plan-price">Later</span>
              <ul className="plan-list">
                {['Team and organisation pages', 'Matter workspace and documents', 'Referral network across jurisdictions', 'Contract lifecycle management'].map((f) => (
                  <li key={f}><span className="plan-tick" aria-hidden="true">✓</span>{f}</li>
                ))}
              </ul>
              <p className="plan-note t-caption">
                Phase 2 and 3. Referrals stay switched off pending a professional-conduct review.
              </p>
              <Link href="/for-professionals" className="btn btn-secondary btn-block" style={{ marginTop: 'auto' }}>What is coming</Link>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================== SOURCE OF RECORD */}
      <section className="container section-tight">
        <div className="grid-auto-lg" style={{ alignItems: 'start' }}>
          <div className="stack gap-4">
            <p className="t-label-mono ink-variant">Source of record</p>
            <h2 className="t-headline-md" style={{ maxWidth: '22ch' }}>
              Ingested from the Bar Council of India, politely.
            </h2>
            <p className="t-body ink-variant">
              robots.txt is obeyed, one request at a time with a two-second delay, and every raw
              response is hashed so we only republish what actually changed.
            </p>
            <div className="row wrap gap-2">
              <Link href="/data-sources" className="btn btn-secondary">Where our data comes from</Link>
              <Link href="/bar-councils" className="btn btn-ghost">All {councils.length} Councils</Link>
            </div>
          </div>

          <div className="stack gap-2">
            {[
              ['Is this a directory of every advocate in India?', 'No, and we will not pretend otherwise. The Bar Council of India publishes the 24 State Bar Councils and each Council’s elected office-bearers — not the full roll. Complete rolls sit on 24 separate Council sites in 24 formats. Extending coverage means writing one adapter per Council, which is planned work.'],
              ['Why do some profiles show no practice areas?', 'Because the register does not state specialisation, and inferring it would be a guess presented as fact about a named person. Practice areas appear once a professional claims the profile and states them.'],
              ['Can an advocate pay to rank higher?', 'No. The ranking weights are published in full and contain no commercial factor. The database column that would carry a paid boost is constrained to zero, so enabling it would need a migration and a code change.'],
              ['Where are the reviews?', 'Switched off. A review system for advocates raises professional-conduct, defamation and data-protection questions we will not resolve by shipping first. The schema is complete and gated behind a flag.'],
            ].map(([q, a]) => (
              <details key={q} className="acc">
                <summary>{q}</summary>
                <div className="acc-body">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================== CTA */}
      <section className="container section-tight">
        <div
          className="stack gap-4 wash"
          style={{
            padding: 'clamp(24px, 5vw, 52px)',
            borderRadius: 'var(--r-xl)',
            background: 'var(--trust-navy)',
            color: '#eef0ff',
            overflow: 'hidden',
          }}
        >
          <p className="t-label-mono" style={{ color: '#a9b2c9' }}>Your data, your call</p>
          <h2 className="t-headline-lg" style={{ maxWidth: '26ch', color: '#fff' }}>
            Listed and would rather not be?
          </h2>
          <p className="t-body measure" style={{ color: '#c7cee0' }}>
            That is a legitimate choice and you do not have to justify it. Ask us to remove your
            listing and we withhold it from public pages immediately while we verify the request.
          </p>
          <div className="row wrap gap-2">
            <Link href="/legal/data-request" className="btn btn-primary">Correct or remove my listing</Link>
            <Link href="/bot" className="btn btn-secondary">About our crawler</Link>
          </div>
        </div>
      </section>
    </>
  );
}
