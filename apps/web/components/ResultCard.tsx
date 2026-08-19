import Link from 'next/link';
import { Avatar } from './Avatar';
import { VerificationBadge, KindChip } from './Badges';
import { MatchScore } from './MatchScore';
import { relativeDate } from '@/lib/format';
import { feeSummary, formatMinor } from '@lexhall/db';
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

  return (
    <article className="result-card lift">
      <Link href={`/advocates/${p.slug}`} aria-label={`Profile of ${p.displayName}`}>
        <Avatar name={p.displayName} src={p.photoUrl} size={64} />
      </Link>

      <div className="stack gap-2" style={{ minWidth: 0 }}>
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <h3 className="t-title">
              <Link href={`/advocates/${p.slug}`} style={{ textDecoration: 'none' }}>{p.displayName}</Link>
            </h3>
            {p.bodyRole && <p className="t-body-sm ink-variant clamp-2">{p.bodyRole}</p>}
          </div>
          <VerificationBadge level={p.verificationLevel} compact />
        </div>

        <div className="row wrap gap-2">
          <KindChip kind={p.kind} />
          {p.locationName && <span className="chip chip-outline">{p.locationName}</span>}
          {p.professionalBodyShort && <span className="chip chip-outline">Bar Council of {p.professionalBodyShort}</span>}
        </div>

        {p.practiceAreas.length > 0 ? (
          <div className="row wrap gap-1">
            {p.practiceAreas.slice(0, 4).map((a) => (
              <span key={a.id} className="chip chip-primary">{a.name}</span>
            ))}
          </div>
        ) : (
          <p className="t-caption">
            Practice areas not stated — they appear once this professional claims the profile.
          </p>
        )}

        {primaryCourts.length > 0 && (
          <p className="t-body-sm ink-variant">
            <span className="t-label-mono">Courts </span>
            {primaryCourts.map((c) => c.shortName ?? c.name).join(' · ')}
            {p.courts.length > 3 && ` +${p.courts.length - 3}`}
          </p>
        )}

        {/* Scannable facts row: years, fee, availability. */}
        <div className="fact-strip">
          <span className="fact-item">
            <span className="fact-label">Experience</span>
            <span className="fact-value">{years !== null ? `${years} yrs` : 'Not stated'}</span>
          </span>
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
            {p.acceptsConsultations ? (
              <Link href={`/advocates/${p.slug}/book`} className="btn btn-primary btn-sm">
                Book{fees?.minConsultMinor != null ? ` · ${formatMinor(fees.minConsultMinor, fees.currencyCode)}` : ''}
              </Link>
            ) : (
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
    </article>
  );
}
