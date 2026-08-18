/** Shared domain vocabulary. Mirrors the SQL schema; no SQL lives here. */

export type ProfessionalKind =
  | 'advocate' | 'senior_advocate' | 'law_firm' | 'chamber'
  | 'lpo' | 'legal_consultant' | 'mediator' | 'arbitrator';

export type ClaimStatus =
  | 'unclaimed' | 'claim_pending' | 'claim_disputed' | 'claimed' | 'opted_out';

/**
 * Verification ladder. The public badge renders the LABEL, never the number,
 * and always alongside what was actually checked.
 */
export const VERIFICATION_LEVELS = [
  { level: 0, key: 'unclaimed',       label: 'Listed from public record', checked: 'Sourced from an official register. Not yet confirmed by the professional.' },
  { level: 1, key: 'email',           label: 'Contact confirmed',         checked: 'A working email address has been confirmed.' },
  { level: 2, key: 'identity',        label: 'Identity checked',          checked: 'Government photo identity reviewed by our team.' },
  { level: 3, key: 'enrolment',       label: 'Bar enrolment verified',    checked: 'Enrolment confirmed against the issuing Bar Council record.' },
  { level: 4, key: 'enhanced',        label: 'Enhanced verification',     checked: 'Enrolment, standing and practice details confirmed.' },
  { level: 5, key: 'organisation',    label: 'Organisation verified',     checked: 'Verified as an authorised representative of the organisation.' },
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number]['level'];

export function verificationMeta(level: number) {
  const clamped = Math.max(0, Math.min(5, Math.trunc(level)));
  return VERIFICATION_LEVELS[clamped] ?? VERIFICATION_LEVELS[0];
}

/** How we know a fact. Drives the "Verified / Self-declared" chip on profiles. */
export type EvidenceBasis = 'source_document' | 'platform_verified' | 'self_declared';

export type ConsultationMode = 'video' | 'audio' | 'phone' | 'chat' | 'in_person';

export const CONSULTATION_MODES: Record<ConsultationMode, string> = {
  video: 'Video call',
  audio: 'Audio call',
  phone: 'Telephone',
  chat: 'Secure chat',
  in_person: 'In person',
};

export type Urgency = 'normal' | 'urgent' | 'emergency';

export interface ProfessionalSummary {
  id: number;
  slug: string;
  kind: ProfessionalKind;
  displayName: string;
  headline: string | null;
  bodyRole: string | null;
  photoUrl: string | null;
  verificationLevel: number;
  claimStatus: ClaimStatus;
  acceptsConsultations: boolean;
  enrolmentYear: number | null;
  yearsExperience: number | null;
  professionalBodyName: string | null;
  professionalBodyShort: string | null;
  locationName: string | null;
  jurisdictionName: string | null;
  practiceAreas: Array<{ id: number; name: string; slug: string; isPrimary: boolean }>;
  courts: Array<{ id: number; name: string; shortName: string | null; tier: number }>;
  languages: string[];
  lastVerifiedAt: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

/** A ranked search hit plus the reason it ranked where it did. */
export interface SearchHit {
  professional: ProfessionalSummary;
  score: number;
  factors: MatchFactor[];
}

export interface MatchFactor {
  key: MatchFactorKey;
  label: string;
  weight: number;
  earned: number;
  detail: string;
}

export type MatchFactorKey =
  | 'practice_relevance' | 'jurisdiction_relevance' | 'court_relevance'
  | 'text_relevance' | 'verified_credentials' | 'experience_relevance'
  | 'availability' | 'profile_completeness';

/**
 * Ranking weights. Sums to 100. Deliberately contains no commercial signal:
 * no subscription tier, no ad spend, no "featured" multiplier. ADR-009.
 */
export const RANKING_WEIGHTS: Record<MatchFactorKey, number> = {
  practice_relevance: 30,
  jurisdiction_relevance: 18,
  court_relevance: 14,
  text_relevance: 12,
  verified_credentials: 10,
  experience_relevance: 8,
  availability: 5,
  profile_completeness: 3,
};

export const MATCH_FACTOR_LABELS: Record<MatchFactorKey, string> = {
  practice_relevance: 'Practice relevance',
  jurisdiction_relevance: 'Jurisdiction relevance',
  court_relevance: 'Court relevance',
  text_relevance: 'Query match',
  verified_credentials: 'Verified credentials',
  experience_relevance: 'Experience relevance',
  availability: 'Accepting consultations',
  profile_completeness: 'Profile completeness',
};
