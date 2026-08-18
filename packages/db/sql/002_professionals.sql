-- ===========================================================================
-- LEXHALL — SCHEMA (part 2: data provenance, professionals, verification)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- DATA SOURCE REGISTRY
-- Every ingested fact traces to a row here. Crawl policy lives with the source
-- rather than in code, so adding a State Bar Council is configuration.
-- ---------------------------------------------------------------------------
CREATE TABLE source (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,          -- 'bci-sbc-directory'
  name              TEXT NOT NULL,
  publisher         TEXT NOT NULL,                 -- 'Bar Council of India'
  base_url          TEXT NOT NULL,
  -- 'official_regulator' | 'official_court' | 'government' | 'self_declared'
  authority         TEXT NOT NULL,
  -- What the source actually contains. Set honestly; the UI surfaces it.
  coverage_note     TEXT NOT NULL,
  robots_checked_at TEXT,
  robots_allows     INTEGER CHECK (robots_allows IN (0,1)),
  terms_url         TEXT,
  terms_reviewed_at TEXT,
  terms_review_note TEXT,
  rate_limit_ms     INTEGER NOT NULL DEFAULT 2000,
  -- 0 disables the adapter without deleting its history.
  is_enabled        INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1)),
  -- Are records from this source allowed on public pages at all?
  publish_allowed   INTEGER NOT NULL DEFAULT 0 CHECK (publish_allowed IN (0,1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE ingestion_run (
  id                INTEGER PRIMARY KEY,
  source_id         INTEGER NOT NULL REFERENCES source(id),
  -- 'running' | 'succeeded' | 'failed' | 'partial' | 'dry_run'
  status            TEXT NOT NULL,
  trigger           TEXT NOT NULL DEFAULT 'manual', -- 'manual'|'schedule'|'backfill'
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  pages_fetched     INTEGER NOT NULL DEFAULT 0,
  records_seen      INTEGER NOT NULL DEFAULT 0,
  records_created   INTEGER NOT NULL DEFAULT 0,
  records_updated   INTEGER NOT NULL DEFAULT 0,
  records_unchanged INTEGER NOT NULL DEFAULT 0,
  records_failed    INTEGER NOT NULL DEFAULT 0,
  error_summary     TEXT,
  notes             TEXT
);
CREATE INDEX idx_run_source ON ingestion_run(source_id, started_at DESC);

-- Immutable raw payload. We never mutate a raw record; a changed upstream page
-- creates a new row with a new content_hash, which is how change detection and
-- record history work.
CREATE TABLE raw_record (
  id                INTEGER PRIMARY KEY,
  source_id         INTEGER NOT NULL REFERENCES source(id),
  ingestion_run_id  INTEGER NOT NULL REFERENCES ingestion_run(id),
  -- Stable identifier within the source, e.g. 'SBC05#surya-prakash-khatri'
  source_ref        TEXT NOT NULL,
  source_url        TEXT NOT NULL,
  payload           TEXT NOT NULL,                 -- JSON, verbatim extraction
  content_hash      TEXT NOT NULL,                 -- sha256 of normalised payload
  captured_at       TEXT NOT NULL,
  -- 'pending' | 'normalised' | 'linked' | 'rejected' | 'superseded'
  state             TEXT NOT NULL DEFAULT 'pending',
  reject_reason     TEXT
);
CREATE INDEX idx_raw_ref ON raw_record(source_id, source_ref, captured_at DESC);
CREATE INDEX idx_raw_hash ON raw_record(content_hash);
CREATE INDEX idx_raw_state ON raw_record(state);

-- Quality-control findings and the failed-record queue in one place, so the
-- admin workbench has a single inbox.
CREATE TABLE ingestion_issue (
  id                INTEGER PRIMARY KEY,
  ingestion_run_id  INTEGER REFERENCES ingestion_run(id),
  raw_record_id     INTEGER REFERENCES raw_record(id),
  professional_id   INTEGER,
  -- 'fetch_failed'|'parse_failed'|'missing_name'|'invalid_enrolment'
  -- |'suspected_duplicate'|'conflicting_record'|'stale_record'|'unmapped_location'
  code              TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'warning', -- 'info'|'warning'|'error'
  detail            TEXT NOT NULL,
  -- 'open' | 'acknowledged' | 'resolved' | 'wont_fix'
  status            TEXT NOT NULL DEFAULT 'open',
  resolved_by       INTEGER,
  resolved_at       TEXT,
  resolution_note   TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_issue_status ON ingestion_issue(status, severity, created_at DESC);
CREATE INDEX idx_issue_code ON ingestion_issue(code);

-- ---------------------------------------------------------------------------
-- PROFESSIONAL — one table for every kind of listed entity, because search,
-- reviews, bookings and referrals all need to address them uniformly.
-- kind: 'advocate'|'senior_advocate'|'law_firm'|'chamber'|'lpo'
--       |'legal_consultant'|'mediator'|'arbitrator'
--
-- PUBLIC vs PRIVATE FIELD DISCIPLINE (docs/COMPLIANCE_MATRIX.md C-07):
--   Columns without a private_ prefix may appear on a public page.
--   private_* columns are admin-only until the profile is claimed AND the
--   owner consents to publication. Personal residential addresses and
--   personal mobile numbers scraped from a regulator's site fall here: the
--   source being public does not make republication proportionate.
-- ---------------------------------------------------------------------------
CREATE TABLE professional (
  id                    INTEGER PRIMARY KEY,
  kind                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  -- Normalised for dedupe/entity resolution: lowercase, honorifics stripped,
  -- initials expanded where unambiguous. Never displayed.
  normalised_name       TEXT NOT NULL,
  display_name          TEXT NOT NULL,
  honorific             TEXT,                       -- 'Sh.', 'Ms.'
  gender                TEXT,                       -- self-declared only, nullable
  headline              TEXT,                       -- claimed profiles only
  bio                   TEXT,                       -- claimed profiles only
  photo_url             TEXT,
  photo_source_url      TEXT,
  country_id            INTEGER NOT NULL REFERENCES country(id),
  primary_jurisdiction_id INTEGER REFERENCES jurisdiction(id),
  primary_location_id   INTEGER REFERENCES location(id),
  -- Institutional/office contact, publishable once verified.
  public_email          TEXT,
  public_phone          TEXT,
  website_url           TEXT,
  -- Personal contact. Ingested for claim-matching and admin verification only.
  private_email         TEXT,
  private_phone         TEXT,
  private_residence     TEXT,
  private_office        TEXT,
  -- Office/chamber address safe to show (court chamber numbers etc.).
  public_office         TEXT,
  years_experience      INTEGER,
  enrolment_year        INTEGER,
  -- Role held at a professional body, e.g. 'Chairman, Bar Council of Delhi'.
  -- Factual, sourced, publishable. NOT a platform accolade.
  body_role             TEXT,
  professional_body_id  INTEGER REFERENCES professional_body(id),
  organisation_id       INTEGER,                    -- firm/chamber they belong to
  -- VERIFICATION LEVEL 0..5, see docs/ARCHITECTURE.md §Verification
  verification_level    INTEGER NOT NULL DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 5),
  -- 'unclaimed'|'claim_pending'|'claim_disputed'|'claimed'|'opted_out'
  claim_status           TEXT NOT NULL DEFAULT 'unclaimed',
  claimed_by_user_id    INTEGER,
  claimed_at            TEXT,
  -- Is this row allowed on public pages right now? Computed by the publish
  -- gate (source.publish_allowed AND NOT opted out AND has minimum fields).
  is_published          INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  -- Confidence in the record's factual accuracy, 0..100. Drives the admin
  -- QC queue. NEVER shown as a quality score for the professional.
  data_confidence       INTEGER NOT NULL DEFAULT 50,
  accepts_consultations INTEGER NOT NULL DEFAULT 0 CHECK (accepts_consultations IN (0,1)),
  -- provenance
  source_id             INTEGER REFERENCES source(id),
  -- Stable identifier for THIS record within the source. Essential where one
  -- page lists many people: source_url alone is not an identity, and matching
  -- on it would collapse every member of a council into a single row.
  source_ref            TEXT,
  source_url            TEXT,
  source_captured_at    TEXT,
  last_verified_at      TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT
);
CREATE INDEX idx_prof_published ON professional(is_published, kind) WHERE deleted_at IS NULL;
CREATE INDEX idx_prof_norm_name ON professional(normalised_name);
CREATE INDEX idx_prof_location ON professional(primary_location_id);
CREATE INDEX idx_prof_jurisdiction ON professional(primary_jurisdiction_id);
CREATE INDEX idx_prof_body ON professional(professional_body_id);
CREATE INDEX idx_prof_claim ON professional(claim_status);
CREATE INDEX idx_prof_confidence ON professional(data_confidence);
CREATE UNIQUE INDEX idx_prof_source_ref ON professional(source_id, source_ref)
  WHERE source_ref IS NOT NULL AND deleted_at IS NULL;

-- Bar enrolment. Separate table because an advocate may hold more than one
-- and because international bodies have different field shapes.
CREATE TABLE enrolment (
  id                    INTEGER PRIMARY KEY,
  professional_id       INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  professional_body_id  INTEGER NOT NULL REFERENCES professional_body(id),
  enrolment_number      TEXT,                       -- 'D/1234/2005'
  enrolled_on           TEXT,
  -- 'active'|'inactive'|'suspended'|'unknown'  — 'unknown' is honest for
  -- records we have not verified against the roll.
  standing              TEXT NOT NULL DEFAULT 'unknown',
  -- How we know: 'source_document'|'platform_verified'|'self_declared'
  evidence_basis        TEXT NOT NULL DEFAULT 'self_declared',
  source_url            TEXT,
  last_verified_at      TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);
CREATE INDEX idx_enrol_prof ON enrolment(professional_id);
CREATE UNIQUE INDEX idx_enrol_number ON enrolment(professional_body_id, enrolment_number)
  WHERE enrolment_number IS NOT NULL;

-- Join tables. is_self_declared distinguishes a claimed profile's assertion
-- from something we sourced, which the UI renders differently.
CREATE TABLE professional_practice_area (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  practice_area_id  INTEGER NOT NULL REFERENCES practice_area(id) ON DELETE CASCADE,
  is_primary        INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  is_self_declared  INTEGER NOT NULL DEFAULT 1 CHECK (is_self_declared IN (0,1)),
  created_at        TEXT NOT NULL,
  PRIMARY KEY (professional_id, practice_area_id)
);
CREATE INDEX idx_ppa_area ON professional_practice_area(practice_area_id);

CREATE TABLE professional_court (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  court_id          INTEGER NOT NULL REFERENCES court(id) ON DELETE CASCADE,
  is_primary        INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  is_self_declared  INTEGER NOT NULL DEFAULT 1 CHECK (is_self_declared IN (0,1)),
  chamber_ref       TEXT,                            -- 'Ch. No. 212, Western Wing'
  created_at        TEXT NOT NULL,
  PRIMARY KEY (professional_id, court_id)
);
CREATE INDEX idx_pc_court ON professional_court(court_id);

CREATE TABLE professional_location (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  location_id       INTEGER NOT NULL REFERENCES location(id),
  label             TEXT,                            -- 'Chamber', 'Registered office'
  address_public    TEXT,
  is_primary        INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_pl_prof ON professional_location(professional_id);
CREATE INDEX idx_pl_loc ON professional_location(location_id);

CREATE TABLE professional_language (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  language_id       INTEGER NOT NULL REFERENCES language(id),
  PRIMARY KEY (professional_id, language_id)
);

CREATE TABLE professional_matter_type (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  matter_type_id    INTEGER NOT NULL REFERENCES matter_type(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, matter_type_id)
);

CREATE TABLE education (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  institution       TEXT NOT NULL,
  qualification     TEXT NOT NULL,
  field             TEXT,
  start_year        INTEGER,
  end_year          INTEGER,
  evidence_basis    TEXT NOT NULL DEFAULT 'self_declared',
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_edu_prof ON education(professional_id);

CREATE TABLE experience (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  organisation_name TEXT NOT NULL,
  role              TEXT NOT NULL,
  start_year        INTEGER,
  end_year          INTEGER,
  is_current        INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
  summary           TEXT,
  evidence_basis    TEXT NOT NULL DEFAULT 'self_declared',
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_exp_prof ON experience(professional_id);

-- ---------------------------------------------------------------------------
-- VERIFICATION — an append-only ledger of verification events, so a badge is
-- always traceable to evidence and a reviewer. Never set
-- professional.verification_level without writing a row here.
-- ---------------------------------------------------------------------------
CREATE TABLE verification (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  level             INTEGER NOT NULL CHECK (level BETWEEN 0 AND 5),
  -- 'email'|'identity_document'|'bar_enrolment'|'roll_lookup'
  -- |'organisation_domain'|'manual_review'
  method            TEXT NOT NULL,
  -- 'granted'|'revoked'|'expired'|'rejected'
  outcome           TEXT NOT NULL,
  evidence_ref      TEXT,                            -- document store key, never the doc
  evidence_note     TEXT,
  verified_by_user_id INTEGER,
  expires_at        TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_verif_prof ON verification(professional_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- CLAIM — "Is this you?" A claim never auto-grants ownership. Two claimants
-- put the profile into 'disputed' for human resolution.
-- ---------------------------------------------------------------------------
CREATE TABLE claim (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL,
  -- 'submitted'|'evidence_requested'|'under_review'|'approved'|'rejected'|'withdrawn'
  status            TEXT NOT NULL DEFAULT 'submitted',
  claimed_enrolment_number TEXT,
  claimed_body_id   INTEGER REFERENCES professional_body(id),
  contact_email     TEXT NOT NULL,
  contact_phone     TEXT,
  -- Signals computed at submission: does the claimant's email/phone match the
  -- private_* contact we hold from the regulator? Strongest automatic signal.
  match_signals     TEXT,                            -- JSON
  match_score       INTEGER NOT NULL DEFAULT 0,
  evidence_refs     TEXT,                            -- JSON array of document keys
  statement         TEXT,
  reviewer_user_id  INTEGER,
  reviewed_at       TEXT,
  decision_note     TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_claim_prof ON claim(professional_id, status);
CREATE INDEX idx_claim_status ON claim(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- DPDP / privacy requests. Every one becomes a traceable ticket.
-- ---------------------------------------------------------------------------
CREATE TABLE data_request (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER REFERENCES professional(id),
  user_id           INTEGER,
  -- 'correction'|'erasure'|'opt_out_listing'|'access'|'export'
  -- |'contact_removal'|'grievance'
  kind              TEXT NOT NULL,
  requester_name    TEXT NOT NULL,
  requester_email   TEXT NOT NULL,
  requester_relation TEXT NOT NULL DEFAULT 'self',   -- 'self'|'authorised_representative'
  detail            TEXT NOT NULL,
  evidence_refs     TEXT,
  -- 'received'|'identity_check'|'in_progress'|'completed'|'rejected'
  status            TEXT NOT NULL DEFAULT 'received',
  -- Statutory clock. DPDP grievance redressal expects a defined period; the
  -- admin dashboard sorts by this so nothing silently ages out.
  due_at            TEXT NOT NULL,
  handled_by_user_id INTEGER,
  resolved_at       TEXT,
  resolution_note   TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_dreq_status ON data_request(status, due_at);
CREATE INDEX idx_dreq_prof ON data_request(professional_id);
