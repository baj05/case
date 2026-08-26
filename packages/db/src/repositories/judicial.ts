/**
 * Judicial statistics (NJDG) — read layer.
 *
 * Everything returned here is SOURCE-DERIVED, never CaseADVO-verified. Each
 * result carries its source and retrieval date so the UI can attribute it
 * rather than presenting a government figure as CaseADVO's own claim.
 *
 * Only the newest `data_version` is ever read. Older generations stay in the
 * table for diffing and rollback, but nothing user-facing mixes versions —
 * that would silently blend two crawls into one incoherent total.
 */
import { db } from '../client.ts';

export type JudicialTier = 'district' | 'high_court' | 'supreme_court';

export interface JudicialStat {
  tier: string;
  metricGroup: string;
  label: string;
  civil: number | null;
  criminal: number | null;
  total: number | null;
  percent: number | null;
}

export interface JudicialSnapshot {
  available: boolean;
  dataVersion: string | null;
  retrievedAt: string | null;
  sources: Array<{ code: string; name: string; url: string; publisher: string; authority: string }>;
  stats: JudicialStat[];
}

function latestVersion(): string | null {
  const row = db().prepare(
    `SELECT data_version AS v FROM judicial_statistic ORDER BY retrieved_at DESC, id DESC LIMIT 1`,
  ).get() as { v: string } | undefined;
  return row?.v ?? null;
}

/** The whole current generation in one query — the page renders several
 * groups, and a round-trip per group would be pure waste for ~40 rows. */
export function getJudicialSnapshot(): JudicialSnapshot {
  const version = latestVersion();
  if (!version) {
    return { available: false, dataVersion: null, retrievedAt: null, sources: [], stats: [] };
  }

  const stats = db().prepare(
    `SELECT tier, metric_group AS metricGroup, label, civil, criminal, total, percent
       FROM judicial_statistic
      WHERE data_version = ?
      ORDER BY tier, metric_group, sort_order`,
  ).all(version) as unknown as JudicialStat[];

  const retrieved = db().prepare(
    `SELECT retrieved_at AS r FROM judicial_statistic WHERE data_version = ? LIMIT 1`,
  ).get(version) as { r: string } | undefined;

  const sources = db().prepare(
    `SELECT DISTINCT s.code, s.name, s.base_url AS url, s.publisher, s.authority
       FROM judicial_statistic j JOIN source s ON s.id = j.source_id
      WHERE j.data_version = ? ORDER BY s.code`,
  ).all(version) as unknown as JudicialSnapshot['sources'];

  return { available: true, dataVersion: version, retrievedAt: retrieved?.r ?? null, sources, stats };
}

/** Narrow a snapshot to one tier + group, preserving ingest order. */
export function pickStats(snap: JudicialSnapshot, tier: JudicialTier, group: string): JudicialStat[] {
  return snap.stats.filter((s) => s.tier === tier && s.metricGroup === group);
}

export function listHighCourts(): Array<{ name: string; slug: string }> {
  return db().prepare(`SELECT name, slug FROM high_court ORDER BY name`).all() as Array<{ name: string; slug: string }>;
}
