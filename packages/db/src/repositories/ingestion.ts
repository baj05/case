/** Source registry, run bookkeeping, raw records and the issue queue. */
import { db, now, flag, transaction } from '../client.ts';
import { stableStringify } from '../ids.ts';
import { createHash } from 'node:crypto';

export interface SourceDefinition {
  code: string; name: string; publisher: string; baseUrl: string;
  authority: 'official_regulator' | 'official_court' | 'government' | 'self_declared';
  coverageNote: string; termsUrl?: string; termsReviewNote?: string;
  rateLimitMs?: number; publishAllowed: boolean;
}

export function registerSource(def: SourceDefinition): number {
  const ts = now();
  const h = db();
  h.prepare(
    `INSERT INTO source (code, name, publisher, base_url, authority, coverage_note, terms_url,
                         terms_reviewed_at, terms_review_note, rate_limit_ms, is_enabled, publish_allowed, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?)
     ON CONFLICT(code) DO UPDATE SET
       name=excluded.name, publisher=excluded.publisher, base_url=excluded.base_url,
       authority=excluded.authority, coverage_note=excluded.coverage_note,
       terms_url=excluded.terms_url, terms_review_note=excluded.terms_review_note,
       rate_limit_ms=excluded.rate_limit_ms, publish_allowed=excluded.publish_allowed, updated_at=excluded.updated_at`,
  ).run(def.code, def.name, def.publisher, def.baseUrl, def.authority, def.coverageNote,
    def.termsUrl ?? null, def.termsReviewNote ? ts : null, def.termsReviewNote ?? null,
    def.rateLimitMs ?? 2000, flag(def.publishAllowed), ts, ts);
  return Number((h.prepare(`SELECT id FROM source WHERE code=?`).get(def.code) as { id: number }).id);
}

export function recordRobotsCheck(sourceId: number, allows: boolean): void {
  db().prepare(`UPDATE source SET robots_checked_at=?, robots_allows=? WHERE id=?`).run(now(), flag(allows), sourceId);
}

export function startRun(sourceId: number, trigger: 'manual' | 'schedule' | 'backfill', dryRun: boolean): number {
  const info = db().prepare(
    `INSERT INTO ingestion_run (source_id, status, trigger, started_at) VALUES (?,?,?,?)`,
  ).run(sourceId, dryRun ? 'dry_run' : 'running', trigger, now());
  return Number(info.lastInsertRowid);
}

export interface RunTotals {
  pagesFetched: number; recordsSeen: number; created: number; updated: number;
  unchanged: number; failed: number;
}

export function finishRun(runId: number, status: 'succeeded' | 'failed' | 'partial' | 'dry_run', totals: RunTotals, errorSummary?: string, notes?: string): void {
  db().prepare(
    `UPDATE ingestion_run SET status=?, finished_at=?, pages_fetched=?, records_seen=?,
       records_created=?, records_updated=?, records_unchanged=?, records_failed=?,
       error_summary=?, notes=? WHERE id=?`,
  ).run(status, now(), totals.pagesFetched, totals.recordsSeen, totals.created, totals.updated,
    totals.unchanged, totals.failed, errorSummary ?? null, notes ?? null, runId);
}

/**
 * Store a raw record. Returns whether the upstream content changed since we
 * last saw this source_ref — the basis for incremental ingestion.
 */
export function storeRaw(input: {
  sourceId: number; runId: number; sourceRef: string; sourceUrl: string; payload: unknown;
}): { rawId: number; isNew: boolean; changed: boolean; previousHash: string | null } {
  return transaction(() => {
    const h = db();
    const hash = createHash('sha256').update(stableStringify(input.payload)).digest('hex');
    const previous = h.prepare(
      `SELECT id, content_hash FROM raw_record WHERE source_id=? AND source_ref=? ORDER BY captured_at DESC LIMIT 1`,
    ).get(input.sourceId, input.sourceRef) as { id: number; content_hash: string } | undefined;

    if (previous?.content_hash === hash) {
      return { rawId: previous.id, isNew: false, changed: false, previousHash: previous.content_hash };
    }

    if (previous) h.prepare(`UPDATE raw_record SET state='superseded' WHERE id=?`).run(previous.id);

    const info = h.prepare(
      `INSERT INTO raw_record (source_id, ingestion_run_id, source_ref, source_url, payload, content_hash, captured_at, state)
       VALUES (?,?,?,?,?,?,?,'pending')`,
    ).run(input.sourceId, input.runId, input.sourceRef, input.sourceUrl,
      JSON.stringify(input.payload), hash, now());

    return { rawId: Number(info.lastInsertRowid), isNew: !previous, changed: true, previousHash: previous?.content_hash ?? null };
  });
}

export function markRawState(rawId: number, state: 'normalised' | 'linked' | 'rejected', reason?: string): void {
  db().prepare(`UPDATE raw_record SET state=?, reject_reason=? WHERE id=?`).run(state, reason ?? null, rawId);
}

export function logIssue(input: {
  runId?: number | null; rawRecordId?: number | null; professionalId?: number | null;
  code: string; severity?: 'info' | 'warning' | 'error'; detail: string;
}): void {
  db().prepare(
    `INSERT INTO ingestion_issue (ingestion_run_id, raw_record_id, professional_id, code, severity, detail, status, created_at)
     VALUES (?,?,?,?,?,?,'open',?)`,
  ).run(input.runId ?? null, input.rawRecordId ?? null, input.professionalId ?? null,
    input.code, input.severity ?? 'warning', input.detail, now());
}

export function listSources() {
  return db().prepare(
    `SELECT s.id, s.code, s.name, s.publisher, s.base_url AS baseUrl, s.authority, s.coverage_note AS coverageNote,
            s.robots_checked_at AS robotsCheckedAt, s.robots_allows AS robotsAllows,
            s.terms_review_note AS termsReviewNote, s.is_enabled AS isEnabled, s.publish_allowed AS publishAllowed,
            (SELECT count(*) FROM professional p WHERE p.source_id = s.id AND p.deleted_at IS NULL) AS recordCount,
            (SELECT max(finished_at) FROM ingestion_run r WHERE r.source_id = s.id) AS lastRunAt
       FROM source s ORDER BY s.name`,
  ).all() as Array<Record<string, string | number | null>>;
}

export function listRuns(limit = 20) {
  return db().prepare(
    `SELECT r.id, r.status, r.trigger, r.started_at AS startedAt, r.finished_at AS finishedAt,
            r.pages_fetched AS pagesFetched, r.records_seen AS recordsSeen, r.records_created AS recordsCreated,
            r.records_updated AS recordsUpdated, r.records_unchanged AS recordsUnchanged,
            r.records_failed AS recordsFailed, r.error_summary AS errorSummary, s.name AS sourceName
       FROM ingestion_run r JOIN source s ON s.id = r.source_id
      ORDER BY r.started_at DESC LIMIT ?`,
  ).all(limit) as Array<Record<string, string | number | null>>;
}

export function listIssues(status = 'open', limit = 50) {
  return db().prepare(
    `SELECT i.id, i.code, i.severity, i.detail, i.status, i.created_at AS createdAt,
            p.display_name AS professionalName, p.slug AS professionalSlug
       FROM ingestion_issue i LEFT JOIN professional p ON p.id = i.professional_id
      WHERE i.status = ? ORDER BY
        CASE i.severity WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, i.created_at DESC
      LIMIT ?`,
  ).all(status, limit) as Array<Record<string, string | number | null>>;
}

export function dataHealth() {
  const h = db();
  const one = (sql: string) => Number((h.prepare(sql).get() as { n: number }).n);
  return {
    total: one(`SELECT count(*) n FROM professional WHERE deleted_at IS NULL`),
    published: one(`SELECT count(*) n FROM professional WHERE is_published=1 AND deleted_at IS NULL`),
    unclaimed: one(`SELECT count(*) n FROM professional WHERE claim_status='unclaimed' AND deleted_at IS NULL`),
    optedOut: one(`SELECT count(*) n FROM professional WHERE claim_status='opted_out'`),
    missingLocation: one(`SELECT count(*) n FROM professional WHERE primary_location_id IS NULL AND deleted_at IS NULL`),
    missingCourt: one(`SELECT count(*) n FROM professional p WHERE deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM professional_court pc WHERE pc.professional_id=p.id)`),
    withPhoto: one(`SELECT count(*) n FROM professional WHERE photo_url IS NOT NULL AND deleted_at IS NULL`),
    openIssues: one(`SELECT count(*) n FROM ingestion_issue WHERE status='open'`),
    errorIssues: one(`SELECT count(*) n FROM ingestion_issue WHERE status='open' AND severity='error'`),
    avgConfidence: Number((h.prepare(`SELECT COALESCE(round(avg(data_confidence),1),0) n FROM professional WHERE deleted_at IS NULL`).get() as { n: number }).n),
    staleOver90d: one(`SELECT count(*) n FROM professional WHERE deleted_at IS NULL AND (last_verified_at IS NULL OR last_verified_at < datetime('now','-90 days'))`),
    openDataRequests: one(`SELECT count(*) n FROM data_request WHERE status NOT IN ('completed','rejected')`),
  };
}
