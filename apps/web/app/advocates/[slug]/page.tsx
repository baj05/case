import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge, KindChip, ClaimChip, ContactChip, EvidenceChip } from '@/components/Badges';
import { ResultCard, WarnIcon } from '@/components/ResultCard';
import { CaseYearChart } from '@/components/CaseYearChart';
import { ResourceCard } from '@/components/ResourceCard';
import { Notice } from '@/components/States';
import { getProfessional, getDetail, getRelated, getFlags, getResourcesForMatter, getReviewSummary, getReviews } from '@/lib/data';
import { listFees, feeSummary, formatMinor, nextAvailabilityDays } from '@lexhall/db';
import { AvailabilityStrip } from '@/components/AvailabilityStrip';
import type { ReviewFilter, ReviewSort } from '@lexhall/db';
import { formatDate, relativeDate, searchHref, COURT_TIER_LABEL } from '@/lib/format';
import { LEGAL_COPY } from '@/lib/brand';
import { verificationMeta, VERIFICATION_LEVELS, CONSULTATION_MODES } from '@lexhall/core';
import { ReviewSection, experienceLabel } from '@/components/ReviewSection';
import { ReviewCard } from '@/components/ReviewCard';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProfessional(slug);
  if (!p) return { title: 'Profile unavailable' };
  const where = [p.locationName, p.jurisdictionName].filter(Boolean).join(', ');
  const isOfficial = p.sourceAuthority === 'official_regulator'
    || p.sourceAuthority === 'official_court' || p.sourceAuthority === 'government';
  return {
    title: `${p.displayName} — ${p.kind === 'senior_advocate' ? 'Senior Advocate' : 'Advocate'}${where ? `, ${where}` : ''}`,
    description:
      `${p.displayName}${p.bodyRole ? `, ${p.bodyRole}` : ''}. `
      + (isOfficial ? 'Listed from the official Bar Council register' : 'Name appears in a public case record')
      + `${p.lastVerifiedAt ? `, last checked ${formatDate(p.lastVerifiedAt)}` : ''}.`,
    alternates: { canonical: `/advocates/${p.slug}` },
    robots: { index: p.claimStatus !== 'opted_out', follow: true },
  };
}

export default async function ProfilePage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ reviewFilter?: string; reviewSort?: string }> }) {
  const { slug } = await params;
  const { reviewFilter: reviewFilterRaw, reviewSort: reviewSortRaw } = await searchParams;
  const reviewFilter = (['all', 'verified', 'anonymous'].includes(reviewFilterRaw ?? '') ? reviewFilterRaw : 'all') as ReviewFilter;
  const reviewSort = (['recent', 'helpful', 'highest', 'lowest'].includes(reviewSortRaw ?? '') ? reviewSortRaw : 'recent') as ReviewSort;
  const p = getProfessional(slug);
  if (!p) notFound();

  const detail = getDetail(slug);
  const related = getRelated(p.id, 4);
  const user = await currentUser();

  // Free resources for the matters this professional has declared.
  // Deduplicated by resource id, capped at 4 so it stays supporting content
  // and never dominates the profile.
  const declaredMatters = detail?.legalMatters ?? [];
  const resourceMap = new Map<number, Awaited<ReturnType<typeof getResourcesForMatter>>[number]>();
  for (const m of declaredMatters.slice(0, 6)) {
    for (const r of getResourcesForMatter(m.slug, 2)) if (!resourceMap.has(r.id)) resourceMap.set(r.id, r);
    if (resourceMap.size >= 4) break;
  }
  const profileResources = [...resourceMap.values()].slice(0, 4);
  const flags = getFlags();
  const fees = listFees(p.id);
  const fsum = feeSummary(p.id);
  const availabilityDays = p.acceptsConsultations ? nextAvailabilityDays(p.id) : [];
  const reviewSummary = getReviewSummary(p.id);
  const hasReviewScore = reviewSummary.band === 'early' || reviewSummary.band === 'established';
  // One representative quote for the glance card — the single most-helpful
  // published review, independent of the `?reviewFilter=/&reviewSort=` the
  // visitor may have set for the full list further down. Only fetched when
  // there is a real score to attach it to, so it never appears floating
  // with nothing to back it.
  const topReview = hasReviewScore && flags.FEATURE_REVIEWS ? getReviews(p.id, { sort: 'helpful', limit: 1 })[0] : undefined;
  const meta = verificationMeta(p.verificationLevel);
  const isUnclaimed = p.claimStatus === 'unclaimed' || p.claimStatus === 'claim_pending';
  const isOfficialSource = p.sourceAuthority === 'official_regulator'
    || p.sourceAuthority === 'official_court' || p.sourceAuthority === 'government';

  // Real, non-fabricated highlight facts only — each one true or omitted,
  // never a placeholder. Deliberately excludes verification level and
  // recommend %, both already shown once (hero badge; rating glance card)
  // — repeating them here would be the same fact twice, not a new one.
  const highlights: Array<{ mark: string; label: string; caption: string }> = [];
  if (p.yearsExperience) {
    highlights.push({
      mark: '✓', label: `${p.yearsExperience} years at the Bar`,
      caption: p.enrolmentYear ? `Enrolled ${p.enrolmentYear}` : 'Per the Bar Council register',
    });
  }
  if (availabilityDays.some((d) => d.count > 0)) {
    highlights.push({ mark: '◆', label: 'Accepting new consultations', caption: 'Slots open this week' });
  }
  if (fees.length > 0) {
    highlights.push({ mark: '✓', label: 'Fees published', caption: `${fees.length} service${fees.length === 1 ? '' : 's'} listed, before you book` });
  }
  if (detail && detail.chambers.length > 0) {
    highlights.push({
      mark: '✓', label: `${detail.chambers.length} court${detail.chambers.length === 1 ? '' : 's'} of practice`,
      caption: detail.chambers[0]?.courtName ?? 'See courts and chambers',
    });
  }

  const tabs = [
    { href: '#overview', label: 'Overview' },
    ...(detail?.bio ? [{ href: '#about', label: 'About' }] : []),
    { href: '#practice-areas', label: 'Practice areas' },
    ...(detail?.caseStats ? [{ href: '#case-statistics', label: 'Case statistics' }] : []),
    { href: '#fees', label: 'Fees' },
    ...(flags.FEATURE_REVIEWS ? [{ href: '#reviews', label: 'Reviews' }] : []),
    ...(profileResources.length > 0 ? [{ href: '#resources', label: 'Resources' }] : []),
    // Lives in the sticky sidebar, not the main reading column — a real
    // link, but excluded from scroll-tracking (see ProfileTabs.tsx).
    { href: '#consultation', label: 'Consultation', trackActive: false },
  ];

  /* Structured data. Only sourced, factual fields — no aggregateRating, because
     we publish no ratings, and asserting one would be fabrication. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.displayName,
    jobTitle: p.kind === 'senior_advocate' ? 'Senior Advocate' : 'Advocate',
    ...(p.bodyRole ? { description: p.bodyRole } : {}),
    ...(p.photoUrl ? { image: p.photoUrl } : {}),
    ...(detail?.body ? { memberOf: { '@type': 'Organization', name: detail.body.name, ...(detail.body.website ? { url: detail.body.website } : {}) } } : {}),
    ...(p.locationName ? { workLocation: { '@type': 'Place', name: p.locationName } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="container section-tight" style={{ paddingBottom: 0 }}>
        <nav aria-label="Breadcrumb" className="t-caption" style={{ marginBottom: 16 }}>
          <Link href="/">Home</Link> <span aria-hidden="true">/</span>{' '}
          <Link href="/search">Professionals</Link> <span aria-hidden="true">/</span>{' '}
          <span aria-current="page">{p.displayName}</span>
        </nav>
      </section>

      {/* ------------------------------------------------- unclaimed notice */}
      {isUnclaimed && (
        <section className="container section-tight" style={{ paddingBottom: 0 }}>
          <Notice tone="warn" title="This profile has not been confirmed by the professional">
            {isOfficialSource ? LEGAL_COPY.unclaimedProfile : LEGAL_COPY.unclaimedProfileFromCaseRecord}{' '}
            <Link href={`/advocates/${p.slug}/claim`} style={{ textDecoration: 'underline' }}>Claim it</Link>{' '}
            to confirm and complete these details, or{' '}
            <Link href={`/legal/data-request?profile=${p.slug}`} style={{ textDecoration: 'underline' }}>request a correction or removal</Link>.
          </Notice>
        </section>
      )}

      <div className="container section-tight">
        {/* Two-column from the very top: profile content on the left, a
            sticky booking widget on the right — the widget is the primary
            action, not an afterthought at the bottom of a sidebar. */}
        <div className="profile-layout">
          {/* ------------------------------------------------------ main col */}
          <div className="stack gap-6" style={{ minWidth: 0 }} id="overview">
            {/* compact hero: identity only. Booking lives in the sidebar widget,
                so this card doesn't repeat it. */}
            <div className="card" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
              <div className="profile-hero">
                <Avatar name={p.displayName} src={p.photoUrl} size={112} priority />
                <div className="stack gap-2" style={{ minWidth: 0 }}>
                  <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                    <h1 className="t-headline-lg">{p.displayName}</h1>
                    <ShareProfileButton name={p.displayName} path={`/advocates/${p.slug}`} />
                  </div>
                  {p.bodyRole && <p className="t-body-lg ink-variant">{p.bodyRole}</p>}
                  <div className="row wrap gap-2">
                    <KindChip kind={p.kind} />
                    <VerificationBadge level={p.verificationLevel} sourceAuthority={p.sourceAuthority} />
                    <ClaimChip status={p.claimStatus} />
                    {p.hasContactInfo && <ContactChip />}
                  </div>
                  <p className="t-caption ink-variant">
                    {[p.locationName, p.jurisdictionName].filter(Boolean).join(' · ')}
                    {p.locationName || p.jurisdictionName ? ' · ' : ''}Register checked {relativeDate(p.lastVerifiedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* rating glance — real number only; see hasReviewScore above */}
            {flags.FEATURE_REVIEWS && hasReviewScore && (
              <div className="card stack gap-3" style={{ padding: 20 }}>
                <div className="row wrap gap-4" style={{ alignItems: 'baseline' }}>
                  <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                      {reviewSummary.overallSatisfaction}
                    </strong>
                    <span className="t-body ink-variant">/ 5</span>
                  </span>
                  <span className="stack" style={{ gap: 0 }}>
                    <strong className="t-title-sm">{experienceLabel(reviewSummary.overallSatisfaction ?? null)}</strong>
                    <span className="t-caption">
                      {reviewSummary.count} experience{reviewSummary.count === 1 ? '' : 's'}
                      {reviewSummary.band === 'early' && ' · early feedback'}
                    </span>
                  </span>
                  {reviewSummary.recommendPercent != null && (
                    <span className="stack" style={{ gap: 0 }}>
                      <strong className="t-title-sm">{reviewSummary.recommendPercent}%</strong>
                      <span className="t-caption">would recommend</span>
                    </span>
                  )}
                  <Link href="#reviews" className="t-caption" style={{ marginLeft: 'auto', textDecoration: 'underline' }}>See all experiences</Link>
                </div>
                {topReview && (
                  <ReviewCard
                    review={{ ...topReview, overallSatisfaction: topReview.ratings.overallSatisfaction, edited: topReview.edited }}
                  />
                )}
              </div>
            )}

            {/* highlights — only real, non-repeated facts; see computation above */}
            {highlights.length > 0 && (
              <div className="grid-auto">
                {highlights.map((h) => (
                  <div key={h.label} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                    <span aria-hidden="true" style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '1.1rem', flex: 'none' }}>{h.mark}</span>
                    <span className="stack" style={{ gap: 2 }}>
                      <strong className="t-body-sm">{h.label}</strong>
                      <span className="t-caption ink-variant">{h.caption}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* section tab bar — real anchors to sections below; the active
                underline tracks scroll position, it does not gate navigation
                (see ProfileTabs). */}
            <ProfileTabs tabs={tabs} />

            {/* about — the professional's own words, self-declared like the
                practice areas below, shown only when they have actually
                written one (bio is a real, currently-empty-by-default column;
                most profiles will not have this section, which is correct —
                it is not filled with a generated placeholder). */}
            {detail?.bio && (
              <section className="stack gap-3" id="about">
                <h2 className="t-headline-md">About {p.displayName}</h2>
                <p className="t-body" style={{ whiteSpace: 'pre-wrap' }}>{detail.bio}</p>
                <p className="t-caption"><EvidenceChip basis="self_declared" /> Written by the professional.</p>
              </section>
            )}

            {/* practice areas */}
            <section className="stack gap-3" id="practice-areas">
              <h2 className="t-headline-md">Practice areas</h2>
              {p.practiceAreas.length > 0 ? (
                <>
                  <div className="row wrap gap-2">
                    {p.practiceAreas.map((a) => (
                      <Link key={a.id} href={searchHref({ practice: a.slug })} className="chip chip-primary chip-button">
                        {a.name}{a.isPrimary && ' ★'}
                      </Link>
                    ))}
                  </div>
                  <p className="t-caption"><EvidenceChip basis="self_declared" /> Stated by the professional.</p>
                </>
              ) : (
                <Notice tone="info">
                  No practice areas are recorded. The Bar Council register does not state
                  specialisation, and we do not infer it — that would be guesswork presented as fact.
                  These appear once the professional claims the profile and states them.
                </Notice>
              )}
            </section>

            {/* case statistics — real, computed from scraped case history */}
            {detail?.caseStats && (
              <section className="stack gap-3" id="case-statistics">
                <h2 className="t-headline-md">Case statistics</h2>
                {detail.caseStats.isImplausibleVolume && (
                  <Notice tone="warn" title="Unusually high case count">
                    <span className="row gap-2" style={{ alignItems: 'flex-start' }}>
                      <WarnIcon />
                      <span>
                        {detail.caseStats.totalCases.toLocaleString()} cases is far more than one advocate
                        typically handles. The source site matches cases to a profile by name, and common
                        names can merge several real people&rsquo;s case histories into one profile —
                        treat this figure with that in mind.
                      </span>
                    </span>
                  </Notice>
                )}
                <div className="fact-strip">
                  <span className="fact-item">
                    <span className="fact-label">Cases on record</span>
                    <span className="fact-value">{detail.caseStats.totalCases.toLocaleString()}</span>
                  </span>
                  {detail.caseStats.disposalRatePct != null && (
                    <span className="fact-item">
                      <span className="fact-label">Disposed</span>
                      <span className="fact-value">{detail.caseStats.disposalRatePct}%</span>
                    </span>
                  )}
                  <span className="fact-item">
                    <span className="fact-label">Court reach</span>
                    <span className="fact-value">{detail.caseStats.distinctCourtCount} court{detail.caseStats.distinctCourtCount === 1 ? '' : 's'}</span>
                  </span>
                  {detail.caseStats.yearsActive != null && (
                    <span className="fact-item">
                      <span className="fact-label">Years on record</span>
                      <span className="fact-value">
                        {detail.caseStats.firstFilingYear}–{detail.caseStats.lastFilingYear}
                      </span>
                    </span>
                  )}
                  {detail.caseStats.mostActiveCourt && (
                    <span className="fact-item" style={{ maxWidth: 260 }}>
                      <span className="fact-label">Most active court</span>
                      <span className="fact-value clamp-2">{detail.caseStats.mostActiveCourt}</span>
                    </span>
                  )}
                </div>

                {detail.caseCategories.length > 0 && (
                  <div className="stack gap-2">
                    <p className="t-caption">Most frequent case types on record</p>
                    <div className="row wrap gap-1">
                      {detail.caseCategories.map((c) => (
                        <span key={c.label} className="chip chip-outline" title={`${c.count} case${c.count === 1 ? '' : 's'}`}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detail.caseYearly.length > 1 && (
                  <div className="stack gap-2">
                    <p className="t-caption">Cases filed by year</p>
                    <CaseYearChart data={detail.caseYearly} />
                  </div>
                )}

                <p className="t-caption">
                  Computed from case records matched to this name on eCourts India (see &ldquo;Where this
                  came from&rdquo; in the sidebar). &ldquo;Disposed&rdquo; means the case concluded, not
                  who prevailed — this platform does not record or infer outcomes.
                </p>
              </section>
            )}

            {detail?.declaredAreas && detail.declaredAreas.length > 0 && (
              <section className="stack gap-3" id="declared-areas">
                <h2 className="t-headline-md">Self-declared on eCourts India</h2>
                <p className="t-caption">
                  Case-type categories the professional selected on their own directory profile — not this
                  platform&rsquo;s practice-area taxonomy, and not verified against actual case filings.
                </p>
                <div className="row wrap gap-1">
                  {detail.declaredAreas.map((label) => (
                    <span key={label} className="chip chip-outline">{label}</span>
                  ))}
                </div>
              </section>
            )}

            {/* courts */}
            <section className="stack gap-3" id="courts">
              <h2 className="t-headline-md">Courts and chambers</h2>
              {detail && detail.chambers.length > 0 ? (
                <div className="scroll-x">
                  <table className="table" style={{ minWidth: 480 }}>
                    <thead>
                      <tr><th scope="col">Court</th><th scope="col">Level</th><th scope="col">Chamber</th></tr>
                    </thead>
                    <tbody>
                      {detail.chambers.map((c) => (
                        <tr key={c.courtSlug}>
                          <th scope="row" style={{ fontWeight: 600 }}>
                            <Link href={searchHref({ court: c.courtSlug })} style={{ textDecoration: 'underline' }}>
                              {c.courtName}
                            </Link>
                          </th>
                          <td className="ink-variant">{COURT_TIER_LABEL[c.tier] ?? '—'}</td>
                          <td className="mono">{c.chamberRef ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="t-body ink-variant">
                  No court appearance is recorded in the source for this professional.
                </p>
              )}
              {detail && detail.chambers.length > 0 && (
                <p className="t-caption"><EvidenceChip basis="source_document" /> Derived from the chamber address published by the Bar Council.</p>
              )}
            </section>

            {/* enrolment */}
            <section className="stack gap-3" id="enrolment">
              <h2 className="t-headline-md">Enrolment</h2>
              {detail && detail.enrolments.length > 0 ? (
                <div className="stack gap-2">
                  {detail.enrolments.map((e, i) => (
                    <div key={i} className="card stack gap-2" style={{ padding: 16 }}>
                      <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                        <strong>{e.bodyName ?? 'Bar Council'}</strong>
                        <EvidenceChip basis={e.evidenceBasis} />
                      </div>
                      <dl className="fact-grid">
                        <div>
                          <dt>Enrolment number</dt>
                          <dd className="mono">{e.enrolmentNumber ?? 'Not published by the source'}</dd>
                        </div>
                        <div>
                          <dt>Standing</dt>
                          <dd>{e.standing === 'unknown' ? 'Not independently confirmed' : e.standing}</dd>
                        </div>
                      </dl>
                      {!e.enrolmentNumber && (
                        <p className="t-caption">
                          The register lists this professional as a member of the Council but does not
                          publish an enrolment number. We record that honestly rather than inferring one.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-body ink-variant">No enrolment record captured.</p>
              )}
            </section>

            {/* office */}
            {detail?.publicOffice && (
              <section className="stack gap-3" id="office">
                <h2 className="t-headline-md">Professional address</h2>
                <p className="t-body">{detail.publicOffice}</p>
                <p className="t-caption">
                  Chamber and office addresses are professional information and are shown. Residential
                  addresses and personal telephone numbers held from the register are never published.
                </p>
              </section>
            )}

            {/* fees */}
            <section className="stack gap-3" id="fees">
              <h2 className="t-headline-md">Fees</h2>
              {fees.length === 0 ? (
                <Notice tone="info">
                  No fees are published. The Bar Council register does not record fees, and we do not
                  estimate them — an invented figure would be worse than none. Fees appear once the
                  professional claims the profile and declares them.
                </Notice>
              ) : (
                <>
                  <div className="scroll-x">
                    <table className="table" style={{ minWidth: 560 }}>
                      <caption className="sr-only">Fee schedule as declared by the professional</caption>
                      <thead>
                        <tr>
                          <th scope="col">Service</th>
                          <th scope="col">Basis</th>
                          <th scope="col" style={{ textAlign: 'right' }}>Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map((f) => (
                          <tr key={f.id}>
                            <th scope="row" className="stack gap-1" style={{ fontWeight: 600 }}>
                              {f.label}
                              <span className="t-caption" style={{ fontWeight: 400 }}>
                                {[f.mode ? CONSULTATION_MODES[f.mode as keyof typeof CONSULTATION_MODES] ?? f.mode : null,
                                  f.durationMinutes ? `${f.durationMinutes} min` : null,
                                  f.isStatutoryPassthrough === 1 ? 'Payable to the court, not the advocate' : null,
                                ].filter(Boolean).join(' · ')}
                              </span>
                              {f.includes && <span className="t-caption" style={{ fontWeight: 400 }}>Includes: {f.includes}</span>}
                              {f.excludes && <span className="t-caption" style={{ fontWeight: 400 }}>Not included: {f.excludes}</span>}
                            </th>
                            <td className="ink-variant" style={{ textTransform: 'capitalize' }}>{f.basis.replace(/_/g, ' ')}</td>
                            <td className="num" style={{ fontWeight: 600 }}>
                              {f.basis === 'on_request' ? 'On request' : formatMinor(f.amountMinor, f.currencyCode)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="t-caption">
                    <EvidenceChip basis="self_declared" /> Declared by the professional. Court and
                    statutory charges are additional and shown separately. This platform does not
                    process these payments and takes no share of them.
                  </p>
                  {flags.DEMO_DATA_SEEDED && (
                    <Notice tone="warn" title="Demo figures">
                      This advocate is a real Bar Council record, but the fees above are seeded
                      illustrations so the booking flow is testable — not their own figures.
                    </Notice>
                  )}
                </>
              )}
            </section>

            {/* reviews — gated by FEATURE_REVIEWS (C-09) */}
            <section className="stack gap-3">
              {flags.FEATURE_REVIEWS ? (
                <ReviewSection
                  basePath="/advocates" slug={p.slug}
                  summary={reviewSummary} reviews={getReviews(p.id, { filter: reviewFilter, sort: reviewSort, limit: 20 })}
                  currentUserId={user?.id} isAdmin={user?.platformRole === 'platform_admin'}
                  filter={reviewFilter} sort={reviewSort}
                />
              ) : (
                <>
                <h2 className="t-headline-md">Reviews</h2>
                <Notice tone="legal" title="Reviews are not published yet">
                  {LEGAL_COPY.reviewsGated} The review system is built and schema-complete, but stays
                  switched off until a professional-conduct and data-protection review is signed off.
                  {' '}<Link href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>Why</Link>.
                </Notice>
                </>
              )}
            </section>

            {/* Matters this professional has declared, with free resources for
                those matters. Only appears when a matter has been claimed —
                otherwise there is nothing honest to show here. */}
            {declaredMatters.length > 0 && (
              <section className="stack gap-3" id="matters">
                <h2 className="t-headline-md">Matters this advocate handles</h2>
                <p className="t-body-sm ink-variant">
                  Declared by the professional. Practice areas are self-declared
                  and appear here after the profile is claimed and completed.
                </p>
                <div className="row wrap gap-1">
                  {declaredMatters.map((m) => (
                    <Link
                      key={m.id}
                      href={m.domainSlug ? `/matters/${m.domainSlug}/${m.slug}` : `/search?legalMatter=${m.slug}`}
                      className="chip chip-button chip-outline"
                    >
                      {m.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {profileResources.length > 0 && (
              <section className="stack gap-3" id="resources">
                <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 className="t-headline-md">Free documents for these matters</h2>
                  <Link href="/resources" className="btn btn-secondary btn-sm">All resources</Link>
                </div>
                <p className="t-body-sm ink-variant">
                  Ordinary starting points people ask an advocate about first — read
                  a template here or open the official form at its own site, then
                  come back and consult when you know what you are dealing with.
                </p>
                <div className="stack gap-3">
                  {profileResources.map((r) => <ResourceCard key={r.id} card={r} />)}
                </div>
              </section>
            )}

            {/* related */}
            {related.length > 0 && (
              <section className="stack gap-3" id="related">
                <h2 className="t-headline-md">Other professionals in the same register</h2>
                <p className="t-body-sm ink-variant">
                  Listed for navigation only. This is not a comparison or a recommendation.
                </p>
                <div className="stack gap-3">
                  {related.map((r) => (
                    <ResultCard
                      key={r.id}
                      showScore={false}
                      hit={{ professional: r, score: 0, factors: [] }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ----------------------------------------------------- side col */}
          <aside className="stack gap-4" style={{ minWidth: 0 }}>
            {/* primary action widget — first thing in the sidebar, sticky,
                so it is visible alongside whichever section the visitor has
                scrolled to, exactly like the booking widget it is modelled on. */}
            <div className="card stack gap-3" style={{ padding: 20 }} id="consultation">
              <h2 className="t-title">Book a consultation</h2>
              {p.acceptsConsultations ? (
                <>
                  {fsum?.minConsultMinor != null && (
                    <p className="t-body-sm">
                      From <strong>{formatMinor(fsum.minConsultMinor, fsum.currencyCode)}</strong> for a first consultation
                    </p>
                  )}
                  {availabilityDays.length > 0 && (
                    <>
                      <AvailabilityStrip days={availabilityDays} slug={p.slug} max={9} />
                      <p className="t-caption">Slot counts shown; exact times and timezone appear on the booking page.</p>
                    </>
                  )}
                  <Link href={`/advocates/${p.slug}/book`} className="btn btn-primary btn-block">Book a consultation</Link>
                  <Link href={`/advocates/${p.slug}/consult`} className="btn btn-secondary btn-block">Send an enquiry instead</Link>
                </>
              ) : (
                <span className="btn btn-secondary btn-block" aria-disabled="true" title="This professional has not enabled consultation requests">
                  Not accepting requests
                </span>
              )}
              {isUnclaimed && (
                <Link href={`/advocates/${p.slug}/claim`} className="btn btn-navy btn-block">Is this you? Claim this profile</Link>
              )}
              <Link href={`/legal/data-request?profile=${p.slug}`} className="t-caption" style={{ textAlign: 'center', textDecoration: 'underline' }}>
                Report an inaccuracy
              </Link>
            </div>

            {/* provenance — the trust core of the product (spec §60) */}
            <div className="card stack gap-3" style={{ padding: 20 }}>
              <h2 className="t-title">Where this came from</h2>
              <dl className="stack gap-2">
                <div className="stack gap-1">
                  <dt className="t-label-mono ink-variant">Source</dt>
                  <dd className="t-body-sm">
                    {detail?.source.publisher ?? p.sourceName ?? 'Not recorded'}
                    {detail?.source.authority === 'official_regulator' && (
                      <span className="chip chip-lime" style={{ marginLeft: 6, fontSize: '0.6875rem' }}>Official regulator</span>
                    )}
                  </dd>
                </div>
                {p.sourceUrl && (
                  <div className="stack gap-1">
                    <dt className="t-label-mono ink-variant">Source page</dt>
                    <dd className="t-body-sm">
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {p.sourceUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="stack gap-1">
                  <dt className="t-label-mono ink-variant">Captured</dt>
                  <dd className="t-body-sm">{formatDate(detail?.sourceCapturedAt)}</dd>
                </div>
                <div className="stack gap-1">
                  <dt className="t-label-mono ink-variant">Last checked</dt>
                  <dd className="t-body-sm">{formatDate(p.lastVerifiedAt)}</dd>
                </div>
                <div className="stack gap-1">
                  <dt className="t-label-mono ink-variant">Claim status</dt>
                  <dd className="t-body-sm">{p.claimStatus.replace(/_/g, ' ')}</dd>
                </div>
              </dl>
            </div>

            {/* verification ladder */}
            <div className="card stack gap-3" style={{ padding: 20 }}>
              <h2 className="t-title">Verification</h2>
              <p className="t-body-sm ink-variant">{meta.checked}</p>
              <ol className="stack gap-2">
                {VERIFICATION_LEVELS.map((lvl) => {
                  const reached = p.verificationLevel >= lvl.level;
                  return (
                    <li key={lvl.level} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                      <span aria-hidden="true" style={{ color: reached ? 'var(--secondary)' : 'var(--outline)', flex: 'none', fontWeight: 700 }}>
                        {reached ? '✓' : '○'}
                      </span>
                      <span className="stack gap-1">
                        <span className="t-body-sm" style={{ fontWeight: reached ? 600 : 400, color: reached ? 'inherit' : 'var(--on-surface-variant)' }}>
                          {lvl.label}
                        </span>
                        {reached && <span className="t-caption">{lvl.checked}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* languages */}
            {p.languages.length > 0 && (
              <div className="card stack gap-2" style={{ padding: 20 }}>
                <h2 className="t-title">Languages</h2>
                <div className="row wrap gap-1">
                  {p.languages.map((l) => <span key={l} className="chip chip-outline">{l}</span>)}
                </div>
              </div>
            )}

            <Notice tone="legal">{LEGAL_COPY.feesGated}</Notice>
          </aside>
        </div>
      </div>
    </>
  );
}
