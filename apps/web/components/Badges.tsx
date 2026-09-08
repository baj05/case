import { verificationMeta } from '@lexhall/core';
import type { ClaimStatus, ProfessionalKind } from '@lexhall/core';

/**
 * Verification badge.
 *
 * Always renders an icon AND text, so status never depends on colour alone
 * (WCAG 1.4.1). The tooltip states exactly what was checked — a badge that
 * cannot explain itself is decoration, and spec §140 forbids that.
 */
export function VerificationBadge({
  level, compact = false, sourceAuthority = null,
}: { level: number; compact?: boolean; sourceAuthority?: string | null }) {
  const meta = verificationMeta(level);
  const icon = level >= 3 ? '✓' : level >= 1 ? '◐' : '○';
  // Level 0's default copy says "an official register" — true for Bar Council
  // sourced records, not for a name pulled from a public case listing. Only
  // the tooltip changes; the badge label stays generic at every level.
  const isOfficialSource = sourceAuthority === 'official_regulator'
    || sourceAuthority === 'official_court' || sourceAuthority === 'government';
  const checked = meta.level === 0 && sourceAuthority && !isOfficialSource
    ? 'Name appears in a public case record. Not a Bar Council listing, and not yet confirmed by the professional.'
    : meta.checked;
  return (
    <span className={`verif verif-${meta.level}`} title={checked}>
      <span aria-hidden="true">{icon}</span>
      <span>{compact && meta.level === 0 ? 'From public record' : meta.label}</span>
    </span>
  );
}

export const KIND_LABEL: Record<ProfessionalKind, string> = {
  advocate: 'Advocate',
  senior_advocate: 'Senior Advocate',
  law_firm: 'Law firm',
  chamber: 'Chambers',
  lpo: 'Legal process outsourcing',
  legal_consultant: 'Legal consultant',
  mediator: 'Mediator',
  arbitrator: 'Arbitrator',
};

export function KindChip({ kind }: { kind: ProfessionalKind }) {
  const isSenior = kind === 'senior_advocate';
  return <span className={`chip ${isSenior ? 'chip-primary' : 'chip-outline'}`}>{KIND_LABEL[kind] ?? kind}</span>;
}

/**
 * A real phone number or email on file — a different, weaker signal than
 * VerificationBadge (which means Bar Council enrolment confirmed), so it
 * gets its own distinct wording rather than reusing "Verified" for two
 * different facts.
 */
export function ContactChip() {
  return <span className="chip chip-teal" title="A phone number or email is on file for this professional">✓ Contact on file</span>;
}

export function ClaimChip({ status }: { status: ClaimStatus }) {
  if (status === 'claimed') return <span className="chip chip-teal">✓ Managed by this professional</span>;
  if (status === 'claim_pending') return <span className="chip chip-warn">Claim under review</span>;
  if (status === 'claim_disputed') return <span className="chip chip-error">Ownership disputed</span>;
  return <span className="chip chip-outline">Unclaimed</span>;
}

/** How a fact is known. Distinguishes sourced from self-asserted (spec §8). */
export function EvidenceChip({ basis }: { basis: string }) {
  if (basis === 'platform_verified') return <span className="chip chip-lime">✓ Verified by us</span>;
  if (basis === 'source_document') return <span className="chip chip-outline">From official record</span>;
  return <span className="chip chip-outline">Self-declared</span>;
}
