/**
 * Explainable ranking.
 *
 * Every hit carries the factors that produced its score, and the profile card
 * can show them. There is no commercial input: no plan tier, no ad budget, no
 * "featured" flag. The `plan.grants_ranking_boost` column is CHECK-constrained
 * to 0 in the schema so this cannot be quietly changed later. ADR-009.
 */
import { RANKING_WEIGHTS, type MatchFactor, type MatchFactorKey } from './types.ts';
import { MATCH_FACTOR_LABELS } from './types.ts';

export interface RankingInput {
  /** 0..1 — does the professional list the requested practice area? */
  practiceRelevance: number;
  practiceDetail: string;
  jurisdictionRelevance: number;
  jurisdictionDetail: string;
  courtRelevance: number;
  courtDetail: string;
  /** 0..1 — normalised FTS relevance. */
  textRelevance: number;
  textDetail: string;
  verificationLevel: number;
  yearsExperience: number | null;
  acceptsConsultations: boolean;
  profileCompleteness: number;
}

export interface RankingOutput { score: number; factors: MatchFactor[] }

export function rank(input: RankingInput): RankingOutput {
  const parts: Array<[MatchFactorKey, number, string]> = [
    ['practice_relevance', clamp(input.practiceRelevance), input.practiceDetail],
    ['jurisdiction_relevance', clamp(input.jurisdictionRelevance), input.jurisdictionDetail],
    ['court_relevance', clamp(input.courtRelevance), input.courtDetail],
    ['text_relevance', clamp(input.textRelevance), input.textDetail],
    [
      'verified_credentials',
      // Level 3 (bar enrolment verified) is the point of real trust, so the
      // curve rewards reaching it rather than scaling linearly to 5.
      clamp(input.verificationLevel >= 3 ? 1 : input.verificationLevel / 4),
      verificationDetail(input.verificationLevel),
    ],
    [
      'experience_relevance',
      // 20+ years saturates. Unknown experience scores neutral, not zero, so
      // unclaimed profiles are not silently buried.
      input.yearsExperience === null ? 0.4 : clamp(input.yearsExperience / 20),
      input.yearsExperience === null ? 'Years in practice not stated' : `${input.yearsExperience} years in practice`,
    ],
    ['availability', input.acceptsConsultations ? 1 : 0, input.acceptsConsultations ? 'Accepting consultation requests' : 'Not currently accepting requests'],
    ['profile_completeness', clamp(input.profileCompleteness / 100), `Profile ${Math.round(input.profileCompleteness)}% complete`],
  ];

  const factors: MatchFactor[] = parts.map(([key, earnedRatio, detail]) => ({
    key,
    label: MATCH_FACTOR_LABELS[key],
    weight: RANKING_WEIGHTS[key],
    earned: Math.round(RANKING_WEIGHTS[key] * earnedRatio * 10) / 10,
    detail,
  }));

  const score = Math.round(factors.reduce((sum, f) => sum + f.earned, 0) * 10) / 10;
  return { score, factors };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function verificationDetail(level: number): string {
  if (level >= 5) return 'Organisation verified';
  if (level >= 4) return 'Enhanced verification complete';
  if (level >= 3) return 'Bar enrolment verified';
  if (level >= 2) return 'Identity checked';
  if (level >= 1) return 'Contact confirmed';
  return 'Listed from public record, not yet confirmed';
}

/** Weights must sum to 100 or the score stops meaning "out of 100". */
export function assertWeightsValid(): void {
  const total = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
  if (total !== 100) throw new Error(`RANKING_WEIGHTS must sum to 100, got ${total}`);
}
