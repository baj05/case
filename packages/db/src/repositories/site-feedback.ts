/**
 * "Rate CaseADVO" — platform feedback, deliberately independent of the
 * advocate/firm/LPO review engine in reviews.ts. Different table, different
 * dataset, no shared moderation queue, no shared aggregate. See the header
 * comment on `site_feedback` in 012_site_feedback.sql for why.
 */
import { db, now } from '../client.ts';

export type ImprovementArea = 'navigation' | 'search' | 'profiles' | 'reviews' | 'booking' | 'resources' | 'payments' | 'mobile' | 'other';

export interface SiteFeedbackInput {
  authorUserId?: number;
  displayMode: 'attributed' | 'anonymous';
  ratings: Partial<Record<'website' | 'search' | 'discovery' | 'booking' | 'resources' | 'speed' | 'design', number>>;
  recommendScore?: number;
  improvementArea?: ImprovementArea;
  comment?: string;
}

export function submitSiteFeedback(input: SiteFeedbackInput): number {
  const result = db().prepare(
    `INSERT INTO site_feedback (
       author_user_id, display_mode, rating_website, rating_search, rating_discovery,
       rating_booking, rating_resources, rating_speed, rating_design, recommend_score,
       improvement_area, comment, created_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    input.authorUserId ?? null, input.displayMode,
    input.ratings.website ?? null, input.ratings.search ?? null, input.ratings.discovery ?? null,
    input.ratings.booking ?? null, input.ratings.resources ?? null, input.ratings.speed ?? null,
    input.ratings.design ?? null, input.recommendScore ?? null, input.improvementArea ?? null,
    input.comment?.trim() || null, now(),
  );
  return Number(result.lastInsertRowid);
}

export interface SiteFeedbackSummary {
  count: number;
  averageOverall: number | null;
  recommendAverage: number | null;
  npsPercent: number | null;   // % promoters (9-10) minus % detractors (0-6), classic NPS
  topImprovementAreas: Array<{ area: string; count: number }>;
}

export function getSiteFeedbackSummary(): SiteFeedbackSummary {
  const h = db();
  const row = h.prepare(
    `SELECT count(*) AS n,
            avg((coalesce(rating_website,0)+coalesce(rating_search,0)+coalesce(rating_discovery,0)
                 +coalesce(rating_booking,0)+coalesce(rating_resources,0)+coalesce(rating_speed,0)
                 +coalesce(rating_design,0)) * 1.0 /
                (nullif((rating_website IS NOT NULL)+(rating_search IS NOT NULL)+(rating_discovery IS NOT NULL)
                 +(rating_booking IS NOT NULL)+(rating_resources IS NOT NULL)+(rating_speed IS NOT NULL)
                 +(rating_design IS NOT NULL), 0))) AS averageOverall,
            avg(recommend_score) AS recommendAverage,
            sum(CASE WHEN recommend_score >= 9 THEN 1 ELSE 0 END) AS promoters,
            sum(CASE WHEN recommend_score <= 6 THEN 1 ELSE 0 END) AS detractors,
            sum(CASE WHEN recommend_score IS NOT NULL THEN 1 ELSE 0 END) AS npsN
       FROM site_feedback`,
  ).get() as {
    n: number; averageOverall: number | null; recommendAverage: number | null;
    promoters: number; detractors: number; npsN: number;
  };

  const areas = h.prepare(
    `SELECT improvement_area AS area, count(*) AS count FROM site_feedback
      WHERE improvement_area IS NOT NULL GROUP BY improvement_area ORDER BY count DESC LIMIT 5`,
  ).all() as Array<{ area: string; count: number }>;

  const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);
  return {
    count: row.n,
    averageOverall: round1(row.averageOverall),
    recommendAverage: round1(row.recommendAverage),
    npsPercent: row.npsN > 0 ? Math.round(((row.promoters - row.detractors) / row.npsN) * 100) : null,
    topImprovementAreas: areas,
  };
}

export function listSiteFeedback(limit = 50) {
  return db().prepare(
    `SELECT sf.id, sf.display_mode AS displayMode, sf.rating_website AS website, sf.rating_search AS search,
            sf.rating_discovery AS discovery, sf.rating_booking AS booking, sf.rating_resources AS resources,
            sf.rating_speed AS speed, sf.rating_design AS design, sf.recommend_score AS recommendScore,
            sf.improvement_area AS improvementArea, sf.comment, sf.status, sf.created_at AS createdAt,
            u.full_name AS authorFullName
       FROM site_feedback sf
       LEFT JOIN app_user u ON u.id = sf.author_user_id
      ORDER BY sf.created_at DESC LIMIT ?`,
  ).all(limit) as Array<Record<string, string | number | null>>;
}
