import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge, KindChip, ClaimChip, EvidenceChip } from '@/components/Badges';
import { ResultCard } from '@/components/ResultCard';
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
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProfessional(slug);
  if (!p) return { title: 'Profile unavailable' };
  const where = [p.locationName, p.jurisdictionName].filter(Boolean).join(', ');
  return {
    title: `${p.displayName} — ${p.kind === 'senior_advocate' ? 'Senior Advocate' : 'Advocate'}${where ? `, ${where}` : ''}`,
    description:
      `${p.displayName}${p.bodyRole ? `, ${p.bodyRole}` : ''}. Listed from the official Bar Council register`
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
  const meta = verificationMeta(p.verificationLevel);
  const isUnclaimed = p.claimStatus === 'unclaimed' || p.claimStatus === 'claim_pending';

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

      {/* ------------------------------------------------------------- hero */}
      <section className="container section-tight">
        <nav aria-label="Breadcrumb" className="t-caption" style={{ marginBottom: 16 }}>
          <Link href="/">Home</Link> <span aria-hidden="true">/</span>{' '}
          <Link href="/search">Professionals</Link> <span aria-hidden="true">/</span>{' '}
          <span aria-current="page">{p.displayName}</span>
        </nav>

        <div className="card" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
          <div className="profile-hero">
            <Avatar name={p.displayName} src={p.photoUrl} size={128} priority />

            <div className="stack gap-3" style={{ minWidth: 0 }}>
              <div className="stack gap-2">
                <h1 className="t-headline-lg">{p.displayName}</h1>
                {p.bodyRole && <p className="t-body-lg ink-variant">{p.bodyRole}</p>}
              </div>

              <div className="row wrap gap-2">
                <KindChip kind={p.kind} />
                <VerificationBadge level={p.verificationLevel} />
                <ClaimChip status={p.claimStatus} />
              </div>

              <dl className="fact-grid">
                {p.professionalBodyName && (
                  <div><dt>Bar Council</dt><dd>{p.professionalBodyName}</dd></div>
                )}
                {p.jurisdictionName && (
                  <div><dt>Jurisdiction</dt><dd>{p.jurisdictionName}</dd></div>
                )}
                {p.locationName && (
                  <div><dt>Based in</dt><dd>{p.locationName}</dd></div>
                )}
                {p.enrolmentYear && (
                  <div><dt>Enrolled</dt><dd>{p.enrolmentYear}</dd></div>
                )}
                <div><dt>Register checked</dt><dd>{relativeDate(p.lastVerifiedAt)}</dd></div>
              </dl>

              <div className="row wrap gap-2">
                {p.acceptsConsultations ? (
                  <>
                    <Link href={`/advocates/${p.slug}/book`} className="btn btn-primary">
                      Book a consultation
                      {fsum?.minConsultMinor != null && ` · from ${formatMinor(fsum.minConsultMinor, fsum.currencyCode)}`}
                    </Link>
                    <Link href={`/advocates/${p.slug}/consult`} className="btn btn-secondary">Send an enquiry instead</Link>
                  </>
                ) : (
                  <span className="btn btn-secondary" aria-disabled="true" title="This professional has not enabled consultation requests">
                    Not accepting requests
                  </span>
                )}
                {isUnclaimed && (
                  <Link href={`/advocates/${p.slug}/claim`} className="btn btn-navy">Is this you? Claim this profile</Link>
                )}
                <Link href={`/legal/data-request?profile=${p.slug}`} className="btn btn-ghost btn-sm">
                  Report an inaccuracy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- rating glance strip
          Shown immediately under the hero, mirroring where review-marketplace
          profiles put trust signals — but only once there is a real number:
          `early`/`established` are the only bands with a computed
          overallSatisfaction (see summarizeSubject). `none`/`new` show
          nothing here rather than a hollow card, and are explained in full
          by ReviewSection further down — one honest message, not two. */}
      {flags.FEATURE_REVIEWS && (reviewSummary.band === 'early' || reviewSummary.band === 'established') && (
        <section className="container section-tight" style={{ paddingTop: 0 }}>
          <Link href="#reviews" className="card row wrap gap-4" style={{ padding: 20, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
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
            <span className="t-caption" style={{ marginLeft: 'auto', textDecoration: 'underline' }}>Read experiences</span>
          </Link>
        </section>
      )}

      {/* ------------------------------------------------- unclaimed notice */}
      {isUnclaimed && (
        <section className="container">
          <Notice tone="warn" title="This profile has not been confirmed by the professional">
            {LEGAL_COPY.unclaimedProfile}{' '}
            <Link href={`/advocates/${p.slug}/claim`} style={{ textDecoration: 'underline' }}>Claim it</Link>{' '}
            to confirm and complete these details, or{' '}
            <Link href={`/legal/data-request?profile=${p.slug}`} style={{ textDecoration: 'underline' }}>request a correction or removal</Link>.
          </Notice>
        </section>
      )}

      <div className="container section-tight">
        <div className="profile-layout">
          {/* ------------------------------------------------------ main col */}
          <div className="stack gap-6" style={{ minWidth: 0 }}>
            {/* practice areas */}
            <section className="stack gap-3">
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

            {/* courts */}
            <section className="stack gap-3">
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
            <section className="stack gap-3">
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
              <section className="stack gap-3">
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
              <section className="stack gap-3">
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
              <section className="stack gap-3">
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
              <section className="stack gap-3">
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
            {/* provenance — the trust core of the product (spec §60) */}
            <div className="card stack gap-3" style={{ padding: 18 }}>
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
            <div className="card stack gap-3" style={{ padding: 18 }}>
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

            {/* next availability */}
            {availabilityDays.length > 0 && (
              <div className="card stack gap-2" style={{ padding: 18 }}>
                <h2 className="t-title">Next available</h2>
                <AvailabilityStrip days={availabilityDays} slug={p.slug} max={9} />
                <p className="t-caption">Slot counts shown; exact times and timezone appear on the booking page.</p>
                <Link href={`/advocates/${p.slug}/book`} className="btn btn-primary btn-sm btn-block">See all times</Link>
              </div>
            )}

            {/* languages */}
            {p.languages.length > 0 && (
              <div className="card stack gap-2" style={{ padding: 18 }}>
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
