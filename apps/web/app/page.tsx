import Link from 'next/link';
import Image from 'next/image';
import { DualSearch } from '@/components/DualSearch';
import { HeroDescribeLink } from './HeroDescribeLink';
import { Notice } from '@/components/States';
import { getCorpus, getPracticeAreas, getCourts, getBarCouncils, databaseReady, getFlags, getRecentReviewFeed, getJudicialData } from '@/lib/data';
import { formatNumber, relativeDate, searchHref, compactIndian } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Fully illustrative example cards for the "Advocates you can book today"
 * row — name, photo, practice area, years, location and fee are all
 * placeholders, disclosed as such beneath the row. Not derived from, and not
 * matched to, any real professional's record. */
const ILLUSTRATIVE_ADVOCATES = [
  { name: 'Rajeev Malhotra', area: 'Corporate & Commercial', years: 22, location: 'Mumbai', fee: '\u20b93,000', photo: '/img/figures/stock-advocate-1.png' },
  { name: 'Arjun Nair', area: 'Arbitration', years: 14, location: 'Bengaluru', fee: '\u20b92,800', photo: '/img/figures/stock-advocate-2.png' },
  { name: 'Vikram Choudhary', area: 'Property & Real Estate', years: 19, location: 'Delhi', fee: '\u20b93,200', photo: '/img/figures/stock-advocate-3.png' },
] as const;

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

export default async function HomePage() {
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

  /* Pendency headline per tier of the judiciary. Rendered largest-first
     (district → high court → supreme) because that is the order a matter
     actually travels, and the magnitude drop across the three is the point. */
  const judicial = getJudicialData();
  const judicialTiers = ([
    ['district', 'District Courts'],
    ['high_court', 'High Courts'],
    ['supreme_court', 'Supreme Court'],
  ] as const)
    .map(([tier, name]) => {
      const row = judicial.stats.find(
        (s) => s.tier === tier && s.metricGroup === 'pendency' && s.label === 'total_pending',
      );
      return row?.total != null
        ? { tier: tier as string, name: name as string, display: compactIndian(row.total) }
        : null;
    })
    .filter((t) => t !== null);
  const topAreas = areas.filter((a) => a.parentId === null);
  // Real ingestion coverage, expressed as the kit's segmented bar.
  const coverageSegments = 24;
  const councilsWithRecords = councils.filter((c) => c.recordCount > 0).length;
  const flags = getFlags();
  const recentReviews = flags.FEATURE_REVIEWS ? getRecentReviewFeed(3) : [];

  return (
    <>
      {/* ============================================== HERO (centered) */}
      <section className="hero-mesh">
        <div className="container hero-center">
          <span className="chip chip-outline hero-badge">
            <span aria-hidden="true" style={{ color: 'var(--action-orange)' }}>●</span>
            Built on official registers and public case records
          </span>

          <h1 className="t-display-xl hero-headline">
            Find the right advocate for <span className="hl">your matter</span>,{' '}
            fast and with confidence.
          </h1>

          <p className="t-body-lg ink-variant hero-subhead">
            Describe the problem in your own words. We work out the practice area, the jurisdiction
            and the court — no legal terminology needed.
          </p>

          <div className="hero-cta-row">
            <div className="hero-search-wrap"><DualSearch /></div>
          </div>

          <div className="hero-trust-row">
            <HeroDescribeLink />
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

          {/* Central cut-out subject with floating glass data cards, styled after
              the Countesia reference: one dominant figure, three supporting cards
              layered around it rather than a rectangular photo card. */}
          <div className="hero-stage">
            <div className="hero-subject-wrap">
              <Image
                src="/img/hero/advocate-cutout.png"
                alt=""
                width={924}
                height={1900}
                priority
                sizes="(max-width: 640px) 280px, (max-width: 1024px) 420px, 520px"
                className="hero-subject"
              />
            </div>

            <div className="glass-card gcard-left">
              <span className="gcard-icon" aria-hidden="true">⚖</span>
              <span className="float-label">Register coverage</span>
              <span className="float-value">{councilsWithRecords}/{corpus.bodies}</span>
              <span className="t-caption">State Bar Councils ingested</span>
              <span className="seg-bar" aria-hidden="true">
                {Array.from({ length: coverageSegments }, (_, i) => (
                  <span key={i} className="seg" data-on={i < councilsWithRecords} />
                ))}
              </span>
            </div>

            <div className="glass-card gcard-top-right">
              <span className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span className="gcard-avatar" aria-hidden="true">✓</span>
                <span className="stack" style={{ gap: 2 }}>
                  <span className="t-title-sm" style={{ fontSize: '0.875rem' }}>Register checked</span>
                  <span className="t-body-sm ink-variant">
                    {corpus.lastIngestAt ? relativeDate(corpus.lastIngestAt) : 'up to date'} — every record traceable
                    to its source.
                  </span>
                </span>
              </span>
            </div>

            <div className="glass-card gcard-bottom-right">
              <span className="row gap-2" style={{ justifyContent: 'space-between' }}>
                <span className="gcard-icon gcard-icon-sm" aria-hidden="true">✓</span>
              </span>
              <span className="float-label">Records published</span>
              <span className="float-value">{formatNumber(corpus.professionals)}</span>
              <span className="t-caption">each with source, capture date and last check</span>
            </div>
          </div>
        </div>
      </section>

      {/* Example queries: search input is in the hero above; these chips
          are the "here is what we understand" gallery, not a second search. */}
      <section className="container" style={{ marginTop: 8 }}>
        <div className="glass stack gap-3" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
          <div className="row wrap gap-2">
            <span className="t-caption" style={{ alignSelf: 'center' }}>Try a search like</span>
            {EXAMPLES.map((ex) => (
              <Link key={ex} href={`/search?q=${encodeURIComponent(ex)}`} className="chip chip-button chip-outline">
                {ex}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ FEATURED (colour blocks)
          Illustrative example cards: name, photo, practice area and fee are
          all placeholders (see disclosure below the row), not a real
          professional's record. "See everyone available" is the only real
          destination here, and it goes to the actual live directory. */}
      {ILLUSTRATIVE_ADVOCATES.length > 0 && (
        <section className="container section-tight">
          <div className="stack gap-5">
            <div className="stack gap-2" style={{ textAlign: 'center', alignItems: 'center' }}>
              <p className="t-label-mono ink-variant">Taking bookings now</p>
              <h2
                className="t-display-lg"
                style={{ maxWidth: '26ch', fontWeight: 800, letterSpacing: '-0.03em' }}
              >
                Advocates you can book <span className="hl">today</span>.
              </h2>
              <p className="t-body ink-variant" style={{ maxWidth: '52ch' }}>
                Real advocates, real fees, and real availability — one click away.
              </p>
              <Link href="/search?accepting=1" className="btn btn-secondary btn-pill" style={{ marginTop: 6 }}>
                See everyone available
              </Link>
            </div>

            <div className="block-row">
              {ILLUSTRATIVE_ADVOCATES.map((a, i) => (
                <article key={a.name} className={`block-card block-${['blue', 'orange', 'lime'][i % 3]}`}>
                  <Image
                    src={a.photo}
                    alt=""
                    width={380}
                    height={440}
                    sizes="380px"
                    className="block-photo"
                  />
                  <div className="block-info">
                    <span className="block-tag">
                      <span className="block-tag-icon" aria-hidden="true">{['⚖', '₹', '📄'][i % 3]}</span>
                      {a.area}
                    </span>
                    <span className="block-name">{a.name}</span>
                    <span className="block-meta">{a.years} yrs · {a.location}</span>
                    <span className="block-fee">
                      {a.fee}
                      <span className="block-fee-sub"> first consultation</span>
                    </span>
                    <Link href="/search?accepting=1" className="btn btn-navy btn-sm btn-block">
                      Book a time
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="t-caption">
              Illustrative example only. These three names, photographs, practice areas and fees are
              placeholders and do not correspond to a real listing — "Book a time" leads to the real,
              live directory rather than a specific record.
            </p>
          </div>
        </section>
      )}

      {/* =========================================================== REVIEWS */}
      <section className="container section-tight">
        <div className="row wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="stack gap-1">
            <p className="t-label-mono ink-variant">Reviews</p>
            <h2 className="t-headline-lg">See what people are saying.</h2>
            <p className="t-body ink-variant" style={{ maxWidth: '48ch' }}>
              Real, verified and anonymous experiences with advocates, law firms and LPO providers —
              never a claim about who wins cases, always about the experience of working with them.
            </p>
          </div>
          <div className="row wrap gap-2">
            <Link href="/reviews" className="btn btn-primary">Browse reviews</Link>
            <Link href="/rate-us" className="btn btn-secondary">Rate your experience</Link>
          </div>
        </div>
        {recentReviews.length > 0 && (
          <div className="row wrap gap-3" style={{ marginTop: 20 }}>
            {recentReviews.map((r) => (
              <div key={r.id} className="card stack gap-1" style={{ padding: 16, flex: '1 1 260px' }}>
                <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                  <strong className="t-body-sm">{r.displayName}</strong>
                  {r.verified && <span className="chip chip-lime" style={{ fontSize: '0.625rem' }}>Verified</span>}
                </span>
                <p className="t-body-sm clamp-3">{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================== ADVO AI */}
      <section className="container section-tight">
        <div
          className="stack gap-4"
          style={{
            padding: 'clamp(20px, 4vw, 36px)', borderRadius: 'var(--r-xl)',
            background: 'var(--trust-navy)', color: '#eef0ff',
          }}
        >
          <div className="row wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="stack gap-2" style={{ maxWidth: '42ch' }}>
              <p className="t-label-mono" style={{ color: '#a9b2c9' }}>Advo AI</p>
              <h2 className="t-headline-lg" style={{ color: '#fff' }}>
                Not sure who you need? <span style={{ color: 'var(--action-orange)' }}>Describe it.</span>
              </h2>
              <p className="t-body" style={{ color: '#c7cee0' }}>
                Advo AI asks a few questions, then shortlists the professionals who can actually act —
                orderable by fee, high to low, or by years in practice. Deterministic and explainable,
                never a chatbot pretending to be a lawyer.
              </p>
            </div>
            <Link href="/advo-ai" className="btn btn-primary btn-pill btn-lg">Start with Advo AI</Link>
          </div>
          <div className="row wrap gap-2">
            {['Fee: high to low', 'Fee: low to high', '10+ years in practice', 'Bar enrolment verified', 'Accepting bookings'].map((t) => (
              <span key={t} className="chip" style={{ background: 'rgba(255,255,255,0.10)', color: '#e7eaf5' }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= STAT BAND */}
      <section className="container section-tight">
        <div className="stat-band on-scroll">
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

      {/* ====================================================== JUDICIAL DATA */}
      {judicial.available && judicialTiers.length > 0 && (
        <section className="container section-tight">
          <div className="card stack gap-4" style={{ padding: 'clamp(20px, 4vw, 34px)' }}>
            <div className="row wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div className="stack gap-2">
                <p className="t-label-mono ink-variant">Judicial data</p>
                <h2 className="t-headline-lg" style={{ maxWidth: '20ch' }}>
                  Know the queue before you join it.
                </h2>
                <p className="t-body ink-variant measure">
                  Official pendency figures for every tier of the Indian judiciary, published by the
                  National Judicial Data Grid.
                </p>
              </div>
              <Link href="/judicial-data" className="btn btn-secondary">See the full picture</Link>
            </div>

            <div className="judicial-strip">
              {judicialTiers.map((t) => (
                <Link key={t.tier} href="/judicial-data" className="judicial-tier">
                  <span className="judicial-tier-num">{t.display}</span>
                  <span className="judicial-tier-name">{t.name}</span>
                  <span className="judicial-tier-sub">cases pending</span>
                </Link>
              ))}
            </div>

            <p className="t-caption">
              Source: National Judicial Data Grid (NIC, Government of India). Aggregate counts only —
              no case records or personal data.
            </p>
          </div>
        </section>
      )}

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

          <div className="cat-grid stagger">
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
      <section className="container section-tight textured" style={{ borderRadius: 'var(--r-xl)' }}>
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
          <div className="step-row stagger">
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

          <div className="plan-grid stagger">
            <div className="plan">
              <span className="plan-name">Listed</span>
              <span className="t-caption">Every advocate in the register, automatically</span>
              <span className="plan-price">Free</span>
              <ul className="plan-list">
                {['Profile compiled from an official register or public case record', 'Full source attribution and freshness dates', 'Correction and removal on request', 'Appears in search on relevance alone'].map((f) => (
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
