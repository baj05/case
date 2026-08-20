-- ===========================================================================
-- LEXHALL — LEGAL MATTER TAXONOMY (6 levels) + RESOURCE LIBRARY
--
-- Why six levels rather than a flat category list: the platform must be able to
-- answer "what is the problem", "where is it handled" and "what service is
-- needed" as SEPARATE questions. Conflating the legal problem with the forum is
-- the mistake that makes a directory useless — "electricity lawyer" is not a
-- practice area, it is a domain plus a matter plus a forum.
--
--   LEGAL_DOMAIN → PRACTICE_AREA → LEGAL_MATTER → LEGAL_ISSUE
--                                              → LEGAL_SERVICE
--                                              → FORUM
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- LEVEL 1: DOMAIN. The broadest grouping a member of the public would
-- recognise ("Property", "Employment", "Electricity & Power").
-- ---------------------------------------------------------------------------
CREATE TABLE legal_domain (
  id            INTEGER PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  plain_summary TEXT NOT NULL,
  icon_hint     TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 100,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Practice areas already exist (level 2). Attach them to a domain.
ALTER TABLE practice_area ADD COLUMN legal_domain_id INTEGER REFERENCES legal_domain(id);
CREATE INDEX IF NOT EXISTS idx_pa_domain ON practice_area(legal_domain_id, sort_order);

-- ---------------------------------------------------------------------------
-- LEVEL 3: MATTER. The specific problem, in the words a person would use.
-- "PF contribution dispute", "Excess electricity billing".
-- ---------------------------------------------------------------------------
CREATE TABLE legal_matter (
  id                INTEGER PRIMARY KEY,
  practice_area_id  INTEGER NOT NULL REFERENCES practice_area(id) ON DELETE CASCADE,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  plain_summary     TEXT,
  -- Who typically brings this: 'individual'|'employee'|'employer'|'business'
  -- |'landlord'|'tenant'|'consumer'|'government'|'any'
  typical_party     TEXT NOT NULL DEFAULT 'any',
  -- Rough urgency default, overridable by the intake classifier.
  default_urgency   TEXT NOT NULL DEFAULT 'normal',
  sort_order        INTEGER NOT NULL DEFAULT 100,
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at        TEXT NOT NULL,
  UNIQUE (practice_area_id, slug)
);
CREATE INDEX idx_matter_pa ON legal_matter(practice_area_id, sort_order);
CREATE INDEX idx_matter_slug ON legal_matter(slug);

-- Plain-language synonyms per matter. This is what makes "my employer hasn't
-- paid my PF" resolve without the user knowing any legal term.
CREATE TABLE legal_matter_synonym (
  id                INTEGER PRIMARY KEY,
  legal_matter_id   INTEGER NOT NULL REFERENCES legal_matter(id) ON DELETE CASCADE,
  phrase            TEXT NOT NULL,
  weight            INTEGER NOT NULL DEFAULT 6,
  kind              TEXT NOT NULL DEFAULT 'plain',
  UNIQUE (legal_matter_id, phrase)
);
CREATE INDEX idx_matter_syn ON legal_matter_synonym(phrase);

-- ---------------------------------------------------------------------------
-- LEVEL 4: ISSUE. The narrow fact pattern inside a matter.
-- Matter "Electricity billing dispute" → issue "Smart meter fast-running".
-- ---------------------------------------------------------------------------
CREATE TABLE legal_issue (
  id                INTEGER PRIMARY KEY,
  legal_matter_id   INTEGER NOT NULL REFERENCES legal_matter(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  created_at        TEXT NOT NULL,
  UNIQUE (legal_matter_id, slug)
);
CREATE INDEX idx_issue_matter ON legal_issue(legal_matter_id);

-- ---------------------------------------------------------------------------
-- LEVEL 5: SERVICE (matter_type already models this). Link matters to the
-- services that are actually appropriate for them, so the platform stops
-- offering "court representation" for a matter that needs a notice.
-- ---------------------------------------------------------------------------
CREATE TABLE legal_matter_service (
  legal_matter_id   INTEGER NOT NULL REFERENCES legal_matter(id) ON DELETE CASCADE,
  matter_type_id    INTEGER NOT NULL REFERENCES matter_type(id) ON DELETE CASCADE,
  is_typical        INTEGER NOT NULL DEFAULT 1 CHECK (is_typical IN (0,1)),
  PRIMARY KEY (legal_matter_id, matter_type_id)
);

-- ---------------------------------------------------------------------------
-- LEVEL 6: FORUM. Where a matter is actually heard or escalated. Distinct from
-- `court` because many forums are not courts: EPFO, an ombudsman, a
-- regulatory commission, a grievance cell.
-- ---------------------------------------------------------------------------
CREATE TABLE forum (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  short_name        TEXT,
  slug              TEXT NOT NULL UNIQUE,
  -- 'court'|'tribunal'|'appellate_tribunal'|'commission'|'regulator'
  -- |'ombudsman'|'authority'|'grievance_cell'|'adr'|'department'
  kind              TEXT NOT NULL,
  -- 'central'|'state'|'district'|'local'
  level             TEXT NOT NULL DEFAULT 'central',
  -- Links to the existing court taxonomy where the forum IS a court.
  court_id          INTEGER REFERENCES court(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  parent_id         INTEGER REFERENCES forum(id),
  statute           TEXT,
  website_url       TEXT,
  -- Ordinary escalation path, e.g. grievance cell → ombudsman → commission.
  escalates_to_id   INTEGER REFERENCES forum(id),
  source_url        TEXT,
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_forum_kind ON forum(kind, level);
CREATE INDEX idx_forum_court ON forum(court_id);

CREATE TABLE legal_matter_forum (
  legal_matter_id   INTEGER NOT NULL REFERENCES legal_matter(id) ON DELETE CASCADE,
  forum_id          INTEGER NOT NULL REFERENCES forum(id) ON DELETE CASCADE,
  -- 'first_instance'|'appeal'|'grievance'|'regulatory'|'alternative'
  stage             TEXT NOT NULL DEFAULT 'first_instance',
  note              TEXT,
  PRIMARY KEY (legal_matter_id, forum_id, stage)
);
CREATE INDEX idx_lmf_forum ON legal_matter_forum(forum_id);

-- Professionals declare the matters they handle, not just broad areas.
CREATE TABLE professional_legal_matter (
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  legal_matter_id   INTEGER NOT NULL REFERENCES legal_matter(id) ON DELETE CASCADE,
  is_self_declared  INTEGER NOT NULL DEFAULT 1 CHECK (is_self_declared IN (0,1)),
  created_at        TEXT NOT NULL,
  PRIMARY KEY (professional_id, legal_matter_id)
);
CREATE INDEX idx_plm_matter ON professional_legal_matter(legal_matter_id);

-- ===========================================================================
-- RESOURCE LIBRARY
-- The existing `resource` table is too thin for a real document library, so a
-- new one supersedes it. `resource_legacy` keeps the old rows (currently zero)
-- rather than dropping a table other code might reference.
-- ===========================================================================
ALTER TABLE resource RENAME TO resource_legacy;

CREATE TABLE resource (
  id                INTEGER PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,

  -- 'OFFICIAL_FORM'|'OFFICIAL_GUIDE'|'GOVERNMENT_DOCUMENT'|'COURT_FORM'
  -- |'TRIBUNAL_FORM'|'LEGAL_TEMPLATE'|'AGREEMENT_TEMPLATE'|'APPLICATION_TEMPLATE'
  -- |'AFFIDAVIT_TEMPLATE'|'NOTICE_TEMPLATE'|'CHECKLIST'|'GUIDE'|'FAQ'
  -- |'JUDGMENT'|'STATUTE'|'RULE'|'REGULATION'|'CIRCULAR'|'NOTIFICATION'
  -- |'REPORT'|'RESOURCE_LINK'|'CALCULATOR'|'EXTERNAL_TOOL'
  resource_type     TEXT NOT NULL,

  -- The distinction that must never blur. Rendered as a badge on every card.
  -- 'OFFICIAL'|'PLATFORM_TEMPLATE'|'THIRD_PARTY'|'REFERENCE'
  official_status   TEXT NOT NULL,

  -- Taxonomy links — a resource is discoverable through the same graph as a
  -- professional, which is the point.
  legal_domain_id   INTEGER REFERENCES legal_domain(id),
  practice_area_id  INTEGER REFERENCES practice_area(id),
  legal_matter_id   INTEGER REFERENCES legal_matter(id),
  matter_type_id    INTEGER REFERENCES matter_type(id),
  forum_id          INTEGER REFERENCES forum(id),
  court_id          INTEGER REFERENCES court(id),

  -- Jurisdiction. A national template presented as valid everywhere is the
  -- single most dangerous thing this library could do: tenancy registration
  -- rules differ by state.
  country_id        INTEGER REFERENCES country(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  location_id       INTEGER REFERENCES location(id),
  -- 1 when the resource genuinely applies nationally.
  is_pan_india      INTEGER NOT NULL DEFAULT 0 CHECK (is_pan_india IN (0,1)),

  authority_name    TEXT,
  language          TEXT NOT NULL DEFAULT 'en',
  version           TEXT NOT NULL DEFAULT '1.0',

  -- Provenance. Same discipline as advocate records.
  resource_source_id INTEGER,
  source_name       TEXT,
  source_url        TEXT,
  original_url      TEXT,
  publication_date  TEXT,
  last_verified_at  TEXT,
  last_checked_at   TEXT,

  -- 'link_only' when we may not mirror the file; 'mirrored' when we may.
  delivery_mode     TEXT NOT NULL DEFAULT 'link_only',
  -- 'public_domain'|'government_open'|'open_licence'|'permission_granted'
  -- |'platform_owned'|'link_only'|'unknown'
  rights_basis      TEXT NOT NULL DEFAULT 'unknown',
  rights_note       TEXT,

  -- 'RAW'|'REVIEW_REQUIRED'|'VERIFIED'|'PUBLISHED'|'SUPERSEDED'|'WITHDRAWN'
  -- |'ARCHIVED'|'UNDER_REVIEW'|'REJECTED'
  status            TEXT NOT NULL DEFAULT 'RAW',
  -- Nothing scraped is ever auto-published. Enforced in the repository too.
  is_published      INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),

  -- Source authority level 1..6, 1 = official government/court.
  trust_level       INTEGER NOT NULL DEFAULT 6 CHECK (trust_level BETWEEN 1 AND 6),
  -- 0..100 composite of authority, freshness, completeness. NOT legal validity.
  quality_score     INTEGER NOT NULL DEFAULT 0,

  disclaimer        TEXT NOT NULL,
  tags              TEXT,
  search_keywords   TEXT,

  view_count        INTEGER NOT NULL DEFAULT 0,
  preview_count     INTEGER NOT NULL DEFAULT 0,
  download_count    INTEGER NOT NULL DEFAULT 0,

  review_due_at     TEXT,
  superseded_by_id  INTEGER REFERENCES resource(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);
CREATE INDEX idx_res_pub ON resource(is_published, resource_type, quality_score DESC);
CREATE INDEX idx_res_matter ON resource(legal_matter_id, is_published);
CREATE INDEX idx_res_pa ON resource(practice_area_id, is_published);
CREATE INDEX idx_res_domain ON resource(legal_domain_id, is_published);
CREATE INDEX idx_res_juris ON resource(jurisdiction_id, is_published);
CREATE INDEX idx_res_status ON resource(status, review_due_at);
CREATE INDEX idx_res_type ON resource(resource_type, official_status);

CREATE TABLE resource_source (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  publisher         TEXT NOT NULL,
  base_url          TEXT NOT NULL,
  trust_level       INTEGER NOT NULL CHECK (trust_level BETWEEN 1 AND 6),
  -- 'central_government'|'state_government'|'court'|'tribunal'
  -- |'legal_services_authority'|'regulator'|'statutory_body'|'institution'
  category          TEXT NOT NULL,
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  robots_checked_at TEXT,
  robots_allows     INTEGER CHECK (robots_allows IN (0,1)),
  mirror_permitted  INTEGER NOT NULL DEFAULT 0 CHECK (mirror_permitted IN (0,1)),
  rights_note       TEXT NOT NULL,
  is_enabled        INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE resource_file (
  id                INTEGER PRIMARY KEY,
  resource_id       INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  version           TEXT NOT NULL DEFAULT '1.0',
  local_path        TEXT,
  original_url      TEXT,
  file_type         TEXT NOT NULL,
  mime_type         TEXT,
  file_size         INTEGER,
  -- SHA-256, the basis for duplicate detection and change detection.
  content_hash      TEXT,
  page_count        INTEGER,
  -- Extracted text for full-text search. NULL when not permitted or not text.
  extracted_text    TEXT,
  text_source       TEXT,
  scan_status       TEXT NOT NULL DEFAULT 'not_scanned',
  is_current        INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0,1)),
  downloaded_at     TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_resfile_res ON resource_file(resource_id, is_current);
CREATE UNIQUE INDEX idx_resfile_hash ON resource_file(content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE resource_version (
  id                INTEGER PRIMARY KEY,
  resource_id       INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  version           TEXT NOT NULL,
  effective_from    TEXT,
  superseded_at     TEXT,
  change_note       TEXT NOT NULL,
  source_url        TEXT,
  content_hash      TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_resver ON resource_version(resource_id, created_at DESC);

CREATE TABLE resource_verification (
  id                INTEGER PRIMARY KEY,
  resource_id       INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  -- 'link_check'|'hash_compare'|'manual_review'|'authority_check'
  method            TEXT NOT NULL,
  outcome           TEXT NOT NULL,
  http_status       INTEGER,
  detail            TEXT,
  checked_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_resverif ON resource_verification(resource_id, created_at DESC);

CREATE TABLE resource_relation (
  from_resource_id  INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  to_resource_id    INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  -- 'related'|'supersedes'|'superseded_by'|'part_of_kit'|'see_also'|'appeal_from'
  relation          TEXT NOT NULL DEFAULT 'related',
  PRIMARY KEY (from_resource_id, to_resource_id, relation)
);

CREATE TABLE resource_collection (
  id                INTEGER PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  -- 'kit'|'user'|'editorial'
  kind              TEXT NOT NULL DEFAULT 'kit',
  intent_phrase     TEXT,
  legal_domain_id   INTEGER REFERENCES legal_domain(id),
  owner_user_id     INTEGER REFERENCES app_user(id),
  disclaimer        TEXT,
  is_published      INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE resource_collection_item (
  collection_id     INTEGER NOT NULL REFERENCES resource_collection(id) ON DELETE CASCADE,
  resource_id       INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  note              TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  PRIMARY KEY (collection_id, resource_id)
);

CREATE TABLE resource_bookmark (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER REFERENCES app_user(id) ON DELETE CASCADE,
  session_ref       TEXT,
  resource_id       INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_resbm ON resource_bookmark(user_id, created_at DESC);
CREATE INDEX idx_resbm_sess ON resource_bookmark(session_ref, created_at DESC);

-- Aggregate only. Never records who downloaded what legal document.
CREATE TABLE resource_event (
  id                INTEGER PRIMARY KEY,
  resource_id       INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  occurred_at       TEXT NOT NULL
);
CREATE INDEX idx_resevent ON resource_event(resource_id, kind, occurred_at DESC);

CREATE VIRTUAL TABLE resource_fts USING fts5(
  title, description, keywords, body,
  tokenize="unicode61 remove_diacritics 2"
);
