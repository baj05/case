-- ===========================================================================
-- eCourtsIndia API-sourced court structure and advocate directory.
--
-- Licensed via the eCourtsIndia partner API (https://ecourtsindia.com/api).
-- Not scraped: that site's robots.txt refuses automated collection, and the
-- API is the sanctioned route. Provenance is recorded per row.
--
-- WHAT IS DELIBERATELY ABSENT: litigant/party names and case-party records.
-- The API exposes them, but they identify private individuals in live
-- proceedings; importing them in bulk is a DPDP Act 2023 exposure that this
-- product does not need. Advocates are different — appearing on the record
-- is a professional act, and an advocate directory is the actual product.
-- ===========================================================================

CREATE TABLE ecourts_state (
  code         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  source_id    INTEGER NOT NULL REFERENCES source(id),
  retrieved_at TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE ecourts_district (
  id            INTEGER PRIMARY KEY,
  state_code    TEXT NOT NULL REFERENCES ecourts_state(code) ON DELETE CASCADE,
  district_code TEXT NOT NULL,
  name          TEXT NOT NULL,
  source_id     INTEGER NOT NULL REFERENCES source(id),
  retrieved_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  UNIQUE (state_code, district_code)
);
CREATE INDEX idx_ecdistrict_state ON ecourts_district(state_code, name);

-- ---------------------------------------------------------------------------
-- Advocates, derived from the advocate names attached to cases. There is no
-- "list advocates" endpoint; the directory is assembled from appearances.
--
-- IDENTITY IS BANDED, NOT RESOLVED. The API frequently returns a surname or
-- initials alone ("SHARMA", "R K SHARMA"), so two rows with similar names may
-- or may not be one person. `identity_confidence` records how much of a name
-- was actually available, and nothing here is merged automatically on the
-- strength of a fuzzy match — a wrong merge silently attributes one
-- advocate's practice to another, which is worse than a duplicate.
-- ---------------------------------------------------------------------------
CREATE TABLE ecourts_advocate (
  id                  INTEGER PRIMARY KEY,
  -- As returned by the API, preserved verbatim for auditability.
  name_raw            TEXT NOT NULL,
  -- Upper-cased, punctuation- and honorific-stripped; the dedup key.
  name_normalised     TEXT NOT NULL UNIQUE,
  -- 'surname_only' | 'initials_surname' | 'full_name'
  identity_confidence TEXT NOT NULL,
  -- How many case appearances contributed to this row. A volume signal only:
  -- NOT a quality, seniority or success measure, and never surfaced as one.
  appearance_count    INTEGER NOT NULL DEFAULT 0,
  -- JSON arrays: which courts / states this name has appeared in.
  court_codes         TEXT,
  state_codes         TEXT,
  first_filing_year   INTEGER,
  last_filing_year    INTEGER,
  -- Set once an advocate claims and verifies this profile, linking it to the
  -- authoritative Bar Council record rather than leaving two parallel truths.
  professional_id     INTEGER REFERENCES professional(id),
  source_id           INTEGER NOT NULL REFERENCES source(id),
  retrieved_at        TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX idx_ecadvocate_name ON ecourts_advocate(name_normalised);
CREATE INDEX idx_ecadvocate_volume ON ecourts_advocate(appearance_count DESC);
CREATE INDEX idx_ecadvocate_claimed ON ecourts_advocate(professional_id);

-- Court codes seen in the data, with the human court name the API supplies.
CREATE TABLE ecourts_court (
  code         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  state_code   TEXT,
  case_count   INTEGER NOT NULL DEFAULT 0,
  source_id    INTEGER NOT NULL REFERENCES source(id),
  retrieved_at TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_eccourt_state ON ecourts_court(state_code, name);
