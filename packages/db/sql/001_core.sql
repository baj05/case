-- ===========================================================================
-- LEXHALL — CORE SCHEMA (part 1: geography, jurisdiction, taxonomy)
--
-- Design rules applied throughout:
--   * Jurisdiction abstraction: nothing is India-specific in structure. India
--     is seeded data, not schema. (docs/DECISIONS.md ADR-004)
--   * Every ingested row carries provenance: source_id, source_url,
--     source_captured_at, last_verified_at. Never publish a fact we cannot
--     attribute.
--   * Soft delete via deleted_at. Hard delete only via a DPDP erasure request,
--     which is itself recorded in data_request.
--   * Timestamps are ISO-8601 UTC strings. SQLite has no timestamptz; the
--     repository layer is the only thing that formats them.
-- ===========================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- COUNTRY / JURISDICTION
-- A country has one or more legal jurisdictions. In India the practical
-- jurisdiction unit for an advocate is the State Bar Council roll plus the
-- courts they appear before, which is why jurisdiction and professional_body
-- are separate tables rather than one.
-- ---------------------------------------------------------------------------
CREATE TABLE country (
  id                INTEGER PRIMARY KEY,
  iso2              TEXT NOT NULL UNIQUE,          -- 'IN'
  iso3              TEXT NOT NULL UNIQUE,          -- 'IND'
  name              TEXT NOT NULL,
  currency_code     TEXT NOT NULL,                 -- 'INR'
  default_locale    TEXT NOT NULL DEFAULT 'en',
  default_timezone  TEXT NOT NULL,                 -- 'Asia/Kolkata'
  phone_code        TEXT NOT NULL,                 -- '+91'
  -- Is the platform legally cleared to operate here? Gates every public page.
  is_launched       INTEGER NOT NULL DEFAULT 0 CHECK (is_launched IN (0,1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE jurisdiction (
  id                INTEGER PRIMARY KEY,
  country_id        INTEGER NOT NULL REFERENCES country(id),
  code              TEXT NOT NULL,                 -- 'IN-DL'
  name              TEXT NOT NULL,                 -- 'Delhi'
  -- 'federal' | 'state' | 'union_territory' | 'emirate' | 'province'
  kind              TEXT NOT NULL,
  legal_system      TEXT NOT NULL,                 -- 'common_law' | 'civil_law' | 'mixed'
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (country_id, code)
);

-- ---------------------------------------------------------------------------
-- PROFESSIONAL BODY  (Bar Council of India, a State Bar Council, the SRA,
-- a US state bar, the Law Society of Singapore ...)
-- Contact/address fields here are INSTITUTIONAL, not personal, so they are
-- safe to publish. Contrast with professional.private_* fields below.
-- ---------------------------------------------------------------------------
CREATE TABLE professional_body (
  id                INTEGER PRIMARY KEY,
  country_id        INTEGER NOT NULL REFERENCES country(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  parent_id         INTEGER REFERENCES professional_body(id),   -- SBC -> BCI
  code              TEXT NOT NULL UNIQUE,          -- 'IN-BCI', 'IN-SBC05'
  external_code     TEXT,                          -- 'SBC05' as used by the source
  name              TEXT NOT NULL,
  short_name        TEXT,
  -- 'apex_regulator' | 'state_bar_council' | 'law_society' | 'high_court_registry'
  kind              TEXT NOT NULL,
  covers_regions    TEXT,                          -- JSON array, source verbatim
  address           TEXT,
  phones            TEXT,                          -- JSON array
  website_url       TEXT,
  -- provenance
  source_id         INTEGER,
  source_url        TEXT,
  source_captured_at TEXT,
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);
CREATE INDEX idx_pb_country ON professional_body(country_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pb_kind ON professional_body(kind);

-- ---------------------------------------------------------------------------
-- LOCATION — a single self-referencing hierarchy rather than a city dropdown,
-- so "Labour lawyer near Noida" and "advocate in Jabalpur" both resolve.
-- level: 0 country, 1 state, 2 division, 3 district, 4 city, 5 locality
-- ---------------------------------------------------------------------------
CREATE TABLE location (
  id                INTEGER PRIMARY KEY,
  country_id        INTEGER NOT NULL REFERENCES country(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  parent_id         INTEGER REFERENCES location(id),
  level             INTEGER NOT NULL CHECK (level BETWEEN 0 AND 5),
  kind              TEXT NOT NULL,                 -- 'state'|'district'|'city'|'locality'
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  -- Materialised ancestor path ('/1/7/42/') so descendant queries are one
  -- LIKE against an indexed column instead of a recursive CTE per request.
  path              TEXT NOT NULL,
  latitude          REAL,
  longitude         REAL,
  population        INTEGER,
  is_searchable     INTEGER NOT NULL DEFAULT 1 CHECK (is_searchable IN (0,1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (country_id, slug)
);
CREATE INDEX idx_location_parent ON location(parent_id);
CREATE INDEX idx_location_path ON location(path);
CREATE INDEX idx_location_level ON location(level, is_searchable);

-- Aliases so "Bombay" finds Mumbai and "Bengaluru" finds Bangalore.
CREATE TABLE location_alias (
  id                INTEGER PRIMARY KEY,
  location_id       INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
  alias             TEXT NOT NULL,
  kind              TEXT NOT NULL DEFAULT 'alternate_name',  -- 'former_name'|'transliteration'
  UNIQUE (location_id, alias)
);
CREATE INDEX idx_location_alias ON location_alias(alias);

-- ---------------------------------------------------------------------------
-- COURT — scalable taxonomy, not an enum. tier orders results sensibly:
-- 1 apex, 2 high court, 3 district, 4 tribunal, 5 consumer forum,
-- 6 special court, 7 arbitral institution
-- ---------------------------------------------------------------------------
CREATE TABLE court (
  id                INTEGER PRIMARY KEY,
  country_id        INTEGER NOT NULL REFERENCES country(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  parent_id         INTEGER REFERENCES court(id),
  location_id       INTEGER REFERENCES location(id),
  tier              INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 7),
  kind              TEXT NOT NULL,
  name              TEXT NOT NULL,
  short_name        TEXT,
  slug              TEXT NOT NULL,
  seat              TEXT,                          -- 'Jabalpur'
  is_bench          INTEGER NOT NULL DEFAULT 0 CHECK (is_bench IN (0,1)),
  website_url       TEXT,
  established_year  INTEGER,
  source_url        TEXT,
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (country_id, slug)
);
CREATE INDEX idx_court_tier ON court(tier);
CREATE INDEX idx_court_location ON court(location_id);
CREATE INDEX idx_court_jurisdiction ON court(jurisdiction_id);

-- ---------------------------------------------------------------------------
-- PRACTICE AREA — hierarchical. parent 'Labour & Employment' -> child
-- 'Provident Fund (PF)'. Synonyms drive plain-language search so a user never
-- needs to know the term "industrial dispute".
-- ---------------------------------------------------------------------------
CREATE TABLE practice_area (
  id                INTEGER PRIMARY KEY,
  parent_id         INTEGER REFERENCES practice_area(id),
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  -- Plain-language description shown to a stressed non-lawyer.
  plain_summary     TEXT NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_pa_parent ON practice_area(parent_id);

-- Weighted synonyms: 'pf not deposited' -> Provident Fund, weight 10.
CREATE TABLE practice_area_synonym (
  id                INTEGER PRIMARY KEY,
  practice_area_id  INTEGER NOT NULL REFERENCES practice_area(id) ON DELETE CASCADE,
  phrase            TEXT NOT NULL,
  weight            INTEGER NOT NULL DEFAULT 5,
  -- 'term'   : legal terminology
  -- 'plain'  : how a member of the public would say it
  -- 'statute': named legislation
  kind              TEXT NOT NULL DEFAULT 'plain',
  UNIQUE (practice_area_id, phrase)
);
CREATE INDEX idx_pas_phrase ON practice_area_synonym(phrase);

CREATE TABLE matter_type (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  -- 'advisory' | 'transactional' | 'litigation' | 'compliance' | 'adr' | 'outsourcing'
  category          TEXT NOT NULL,
  plain_summary     TEXT NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

CREATE TABLE language (
  id                INTEGER PRIMARY KEY,
  iso639            TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  native_name       TEXT NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 100
);
