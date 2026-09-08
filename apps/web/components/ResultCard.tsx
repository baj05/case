import Link from 'next/link';
import { Avatar } from './Avatar';
import { VerificationBadge, ClaimChip, ContactChip, KIND_LABEL } from './Badges';
import { MatchScore } from './MatchScore';
import { ResultBooking } from './ResultBooking';
import { relativeDate } from '@/lib/format';
import { feeSummary, formatMinor, nextAvailabilityDays, generateSlots, listFees, chamberAddress, getCaseStats, getCaseCategories } from '@lexhall/db';
import { getFlags, getReviewSummary, getPracticeAreas } from '@/lib/data';
import type { SearchHit } from '@lexhall/core';

/**
 * One search result.
 *
 * Shows only sourced, factual attributes plus what has been verified. There is
 * no invented rating, no "top lawyer" flourish, and no fee — fees are set by
 * the professional and are not held by the platform.
 */
export function ResultCard({ hit, showScore = true }: { hit: SearchHit; showScore?: boolean }) {
  const p = hit.professional;
  const primaryCourts = p.courts.slice(0, 3);
  // Fee and years are what people actually compare on, so they get their own
  // column rather than being buried in the body — Practo's listing model.
  const fees = feeSummary(p.id);
  const years = p.yearsExperience
    ?? (p.enrolmentYear ? new Date().getFullYear() - p.enrolmentYear : null);
  const flags = getFlags();
  const reviewSummary = flags.FEATURE_REVIEWS ? getReviewSummary(p.id) : null;
  const caseStats = getCaseStats(p.id);
  const topCategories = getCaseCategories(p.id, 3);

  // Only fetched for professionals actually taking bookings — the drawer's
  // full fee schedule and slot list, not just the summary already above.
  // Bounded to a 12-per-page result set (see /search/page.tsx), same order
  // of cost as the Advo AI shortlist doing the same per-card lookup.
  const availabilityDays = p.acceptsConsultations ? nextAvailabilityDays(p.id) : [];
  const bookingSlots = p.acceptsConsultations ? generateSlots(p.id, new Date().toISOString(), 14) : [];
  const allFees = p.acceptsConsultations ? listFees(p.id) : [];
  const office = p.acceptsConsultations ? chamberAddress(p.id) : null;

  return (
    <article className="result-card lift">
      <Link href={`/advocates/${p.slug}`} aria-label={`Profile of ${p.displayName}`}>
        <Avatar name={p.displayName} src={p.photoUrl} size={64} />
      </Link>

      <div className="result-card-body">
        {/* -------------------------------------------------- left: profile */}
        <div className="stack gap-2" style={{ minWidth: 0 }}>
          {/* Status badge sits above the name — the one thing worth leading
              with, and never a paid-placement label: no listing here is
              ever ranked or marked for a fee (spec — no "Sponsored" tag). */}
          <div className="row wrap gap-2" style={{ alignItems: 'center' }}>
            <VerificationBadge level={p.verificationLevel} sourceAuthority={p.sourceAuthority} />
            {p.claimStatus === 'claimed' && <ClaimChip status={p.claimStatus} />}
            {p.hasContactInfo && <ContactChip />}
          </div>

          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <h3 className="t-title">
              <Link href={`/advocates/${p.slug}`} style={{ textDecoration: 'none' }}>{p.displayName}</Link>
            </h3>
            {p.bodyRole && <p className="t-body-sm ink-variant clamp-2">{p.bodyRole}</p>}
          </div>

          {/* Real client feedback only — never a manufactured star rating. */}
          {reviewSummary && !reviewSummary.insufficientSample && (
            <p className="row gap-1" style={{ alignItems: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3.5l2.47 5.18 5.53.65-4.08 3.9 1.06 5.6L12 15.9l-5-2.87 1.06-5.6-4.08-3.9 5.53-.65L12 3.5z" fill="var(--action-orange)" />
              </svg>
              <span className="t-body-sm" style={{ fontWeight: 600 }}>{reviewSummary.overallSatisfaction}</span>
              <span className="t-body-sm ink-variant">· {reviewSummary.count} experience{reviewSummary.count === 1 ? '' : 's'}</span>
            </p>
          )}

          {p.locationName && (
            <p className="row gap-1 t-body-sm ink-variant" style={{ alignItems: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              {p.locationName}
              {p.jurisdictionName && p.jurisdictionName !== p.locationName ? `, ${p.jurisdictionName}` : ''}
            </p>
          )}

          {/* Credential-style badges: real Bar Council body, kind, courts,
              declared practice areas — the honest equivalent of the
              affiliation badges a medical directory would show. */}
          <div className="row wrap gap-1">
            <span className="badge-credential"><KindIcon />{KIND_LABEL[p.kind]}</span>
            {p.professionalBodyShort && <span className="badge-credential"><BadgeIcon />Bar Council of {p.professionalBodyShort}</span>}
            {primaryCourts.map((c) => (
              <span key={c.id} className="badge-credential"><CourtIcon />{c.shortName ?? c.name}</span>
            ))}
            {p.courts.length > 3 && <span className="badge-credential">+{p.courts.length - 3} more courts</span>}
          </div>

          {p.practiceAreas.length > 0 ? (
            <div className="row wrap gap-1">
              {p.practiceAreas.slice(0, 4).map((a) => (
                <span key={a.id} className="chip chip-primary">{a.name}</span>
              ))}
            </div>
          ) : topCategories.length > 0 ? (
            <div className="stack gap-1">
              <p className="t-caption">From case history, not a claimed specialisation:</p>
              <div className="row wrap gap-1">
                {topCategories.map((c) => (
                  <span key={c.label} className="chip chip-outline" title={`${c.count} case${c.count === 1 ? '' : 's'} on record`}>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="t-caption">
              Practice areas not stated — they appear once this professional claims the profile.
            </p>
          )}

          {/* Scannable facts row: years, fee, availability. */}
          <div className="fact-strip">
            <span className="fact-item">
              <span className="fact-label">Experience</span>
              <span className="fact-value">{years !== null ? `${years} yrs` : 'Not stated'}</span>
            </span>
            {caseStats && (
              <span className="fact-item">
                <span className="fact-label">Cases on record</span>
                <span className="fact-value row gap-1" style={{ alignItems: 'center', display: 'inline-flex' }}>
                  {caseStats.totalCases.toLocaleString()}
                  {caseStats.isImplausibleVolume && (
                    <span title="A very high count for one name usually means the source has merged several people who share it — see the profile for the full caveat.">
                      <WarnIcon />
                    </span>
                  )}
                </span>
              </span>
            )}
            {caseStats?.disposalRatePct != null && (
              <span className="fact-item">
                <span className="fact-label">Disposed</span>
                <span className="fact-value">{caseStats.disposalRatePct}%</span>
              </span>
            )}
            <span className="fact-item">
              <span className="fact-label">Consultation</span>
              <span className="fact-value">
                {fees?.minConsultMinor != null
                  ? formatMinor(fees.minConsultMinor, fees.currencyCode)
                  : 'Fee not published'}
              </span>
            </span>
            <span className="fact-item">
              <span className="fact-label">Availability</span>
              <span className="fact-value">
                {p.acceptsConsultations ? 'Bookable' : 'Enquiry only'}
              </span>
            </span>
            {fees?.hasFilingFees === 1 && (
              <span className="fact-item">
                <span className="fact-label">Filing charges</span>
                <span className="fact-value">Published</span>
              </span>
            )}
          </div>

          <div className="row wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
            {showScore && <MatchScore score={hit.score} factors={hit.factors} />}
            {/* Must wrap: at 320px these two controls together exceed the card. */}
            <div className="row wrap gap-2">
              <Link href={`/advocates/${p.slug}`} className="btn btn-secondary btn-sm">View profile</Link>
              {!p.acceptsConsultations && (
                <span className="chip chip-outline" title="This professional has not yet enabled consultation requests">
                  Not accepting requests
                </span>
              )}
            </div>
          </div>

          <p className="t-caption">
            {p.sourceName ? `Source: ${p.sourceName}` : 'Source recorded'} · checked {relativeDate(p.lastVerifiedAt)}
          </p>
        </div>

        {/* ----------------------------------------- right: availability + book */}
        {p.acceptsConsultations && availabilityDays.length > 0 && (
          <div className="stack gap-2">
            <span className="t-label-mono ink-variant">Next available</span>
            <ResultBooking
              slug={p.slug} professionalName={p.displayName}
              availabilityDays={availabilityDays} slots={bookingSlots}
              fees={allFees.map((f) => ({
                id: f.id, kind: f.kind, label: f.label, mode: f.mode,
                durationMinutes: f.durationMinutes, currencyCode: f.currencyCode,
                amountMinor: f.amountMinor, basis: f.basis, includes: f.includes,
                excludes: f.excludes, isStatutoryPassthrough: f.isStatutoryPassthrough,
                taxNote: f.taxNote,
              }))}
              areas={getPracticeAreas().map((a) => ({ id: a.id, name: a.name, parentName: a.parentName }))}
              chamberAddress={office}
            />
            <Link href={`/advocates/${p.slug}/book`} className="btn btn-primary btn-sm btn-block">
              Book{fees?.minConsultMinor != null ? ` · ${formatMinor(fees.minConsultMinor, fees.currencyCode)}` : ''}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function KindIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v18M5 7l-3 6a3 3 0 0 0 6 0l-3-6zm14 0l-3 6a3 3 0 0 0 6 0l-3-6zM4 7h16M9 3h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BadgeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 13.5L7 21l5-2.5 5 2.5-2-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function CourtIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 21h16M5 21V10M19 21V10M3 10l9-5 9 5M8 10v7M12 10v7M16 10v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5L2 20.5h20L12 3.5z" stroke="var(--warning-container)" fill="var(--warning-container)" strokeLinejoin="round" />
      <path d="M12 9.5v5M12 17.5v.1" stroke="var(--on-warning-container)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
