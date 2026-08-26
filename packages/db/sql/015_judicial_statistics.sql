-- ===========================================================================
-- Judicial statistics from the National Judicial Data Grid (NJDG), published
-- by NIC / Ministry of Electronics & IT, Government of India.
--
-- SCOPE — deliberately narrow. This table holds AGGREGATE COUNTS ONLY:
-- pendency totals, age bands, institution/disposal flow, case-type splits.
-- It holds NO case records, NO party or litigant names, NO advocate-to-case
-- linkage. That restraint is the point: bulk case-level data names real
-- people in live proceedings, and republishing it carries DPDP Act 2023
-- exposure that aggregate counts simply do not. If case-level data is ever
-- wanted, it needs its own review — not an extension of this table.
--
-- Every row is source-derived, never CaseADVO-verified: `source_id` and
-- `retrieved_at` are mandatory so the UI can always state where a figure
-- came from and how old it is. `data_version` lets a fresh crawl land
-- alongside the previous one rather than destroying it, so a bad ingest is
-- recoverable and change over time stays visible.
-- ===========================================================================

CREATE TABLE judicial_statistic (
  id            INTEGER PRIMARY KEY,
  source_id     INTEGER NOT NULL REFERENCES source(id),
  -- 'district' | 'high_court' | 'supreme_court'
  tier          TEXT    NOT NULL,
  -- 'pendency' | 'age_band' | 'flow' | 'litigant_profile' | 'case_type' | 'delay_reason'
  metric_group  TEXT    NOT NULL,
  -- Human-readable dimension within the group, e.g. 'Above 10 years',
  -- 'Writ Petition', 'instituted_last_month'.
  label         TEXT    NOT NULL,
  civil         INTEGER,
  criminal      INTEGER,
  total         INTEGER,
  percent       REAL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  data_version  TEXT    NOT NULL,
  retrieved_at  TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  -- Re-running the same ingest is idempotent; a NEW data_version inserts
  -- a fresh generation instead of overwriting the last one.
  UNIQUE (source_id, tier, metric_group, label, data_version)
);

CREATE INDEX idx_judstat_lookup ON judicial_statistic(tier, metric_group, sort_order);
CREATE INDEX idx_judstat_version ON judicial_statistic(data_version, retrieved_at DESC);

-- The 25 High Courts, as named by NJDG itself. Kept as a registry rather
-- than free text so filters and future per-court figures share one spelling.
CREATE TABLE high_court (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  slug         TEXT NOT NULL UNIQUE,
  source_id    INTEGER NOT NULL REFERENCES source(id),
  retrieved_at TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
