-- ===========================================================================
-- Verified-advocate-directory case statistics (spec: ecourtsindia.com
-- "Verified Advocates" self-registered profile scrape)
-- ===========================================================================

-- One row per professional: real, computed aggregates from their scraped
-- case history. Never a claimed "win rate" — DISPOSED means the case
-- concluded, not that this advocate's side prevailed; the site itself does
-- not record outcomes, so neither do we.
CREATE TABLE professional_case_stats (
  professional_id       INTEGER PRIMARY KEY REFERENCES professional(id) ON DELETE CASCADE,
  total_cases           INTEGER NOT NULL DEFAULT 0,
  disposed_cases        INTEGER NOT NULL DEFAULT 0,
  pending_cases         INTEGER NOT NULL DEFAULT 0,
  disposal_rate_pct     REAL,                        -- NULL when total_cases = 0
  distinct_court_count  INTEGER NOT NULL DEFAULT 0,
  most_active_court     TEXT,                         -- free-text label; most case rows
                                                       -- are district courts outside the
                                                       -- curated court table, so this is
                                                       -- descriptive text, not a court_id FK.
  first_filing_year     INTEGER,                       -- bounded to a plausible range;
  last_filing_year      INTEGER,                       -- see ingest script for the guard.
  years_active          INTEGER,
  computed_at           TEXT NOT NULL
);

-- Top case categories per advocate ("Motor Accident Claims Appeal", "Civil
-- Suit"...) — real category text from cases.csv, ranked by frequency. Drives
-- the "specialization tags" the case data can actually support (NOT the same
-- as professional_practice_area, which is the platform's own curated,
-- claimed-profile taxonomy).
CREATE TABLE professional_case_category (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  category_label    TEXT NOT NULL,
  case_count        INTEGER NOT NULL,
  rank              INTEGER NOT NULL                  -- 1 = most frequent
);
CREATE INDEX idx_pcc_prof ON professional_case_category(professional_id, rank);

-- Cases-by-year, for the activity-trend chart. One row per (professional,
-- year) with a case in the scraped history.
CREATE TABLE professional_case_year (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  filing_year       INTEGER NOT NULL,
  case_count        INTEGER NOT NULL,
  PRIMARY KEY (professional_id, filing_year)
);

-- Self-declared "areas of practice" from the advocate's OWN directory
-- profile (case-type-shaped labels like "Anticipatory Bail Application" —
-- the site's own selectable list, not this platform's curated practice-area
-- taxonomy). Kept as its own table rather than forced into
-- professional_practice_area, which means something more specific here
-- (a claimed profile's declaration against our own taxonomy).
CREATE TABLE professional_declared_area (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  PRIMARY KEY (professional_id, label)
);
