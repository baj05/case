-- ===========================================================================
-- LEXHALL — RESOURCE LIBRARY, PART 2
--
-- Migration 007 created the resource tables. This file adds what a working
-- document library needs on top of them:
--
--   * the public information architecture (resource_category), so a category
--     page is a real entity with a description and a URL rather than a filter
--     string in a query parameter;
--   * storage for platform-authored document bodies (resource_template), which
--     is what makes preview and download possible for anything at all — every
--     official document is link-only, so if the library could not render its own
--     templates it would have nothing to preview;
--   * additional links per resource (resource_link), because a covering
--     application usually has to point at the prescribed form as well;
--   * the columns the catalogue needs on `resource` itself.
--
-- Design note on why templates live in the database rather than being read from
-- the TypeScript seed at request time: the seed is the source of truth for
-- authoring, but the library has to be able to serve a version that was
-- published before the seed changed. Versioning a document you re-read from
-- source on every request is not versioning.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Columns on `resource`.
-- ---------------------------------------------------------------------------
ALTER TABLE resource ADD COLUMN category_code TEXT;
ALTER TABLE resource ADD COLUMN subcategory TEXT;
-- 'pdf'|'html'|'portal'|'docx'|'xlsx'|'zip'|'template'
ALTER TABLE resource ADD COLUMN doc_format TEXT NOT NULL DEFAULT 'html';
-- The stable page a document lives on, when source_url is the document itself.
ALTER TABLE resource ADD COLUMN landing_url TEXT;
-- Everything in this library is free to obtain. The badge exists to say so
-- without implying that free means legally sufficient (spec §97).
ALTER TABLE resource ADD COLUMN is_free INTEGER NOT NULL DEFAULT 1 CHECK (is_free IN (0,1));
-- "What this actually is, and when you need it" — JSON array of strings.
ALTER TABLE resource ADD COLUMN usage_notes TEXT;
-- The last time a link check on this resource succeeded, as distinct from the
-- last time one ran. The difference is the whole point of the monitor.
ALTER TABLE resource ADD COLUMN last_ok_at TEXT;
-- Latest link-check classification: ok|redirected|blocked|unreachable|gone|server_error
ALTER TABLE resource ADD COLUMN link_state TEXT;
-- How this row entered the library: 'catalogue'|'template'|'harvest'|'admin'
ALTER TABLE resource ADD COLUMN origin TEXT NOT NULL DEFAULT 'catalogue';

CREATE INDEX IF NOT EXISTS idx_res_category ON resource(category_code, is_published, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_res_linkstate ON resource(link_state, last_checked_at);
CREATE INDEX IF NOT EXISTS idx_res_origin ON resource(origin, status);
CREATE INDEX IF NOT EXISTS idx_res_state_cat ON resource(jurisdiction_id, category_code, is_published);

-- ---------------------------------------------------------------------------
-- The public information architecture.
-- ---------------------------------------------------------------------------
CREATE TABLE resource_category (
  id              INTEGER PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  plain_summary   TEXT NOT NULL,
  icon_hint       TEXT,
  legal_domain_id INTEGER REFERENCES legal_domain(id),
  -- JSON array of subcategory names, in display order.
  subcategories   TEXT NOT NULL DEFAULT '[]',
  sort_order      INTEGER NOT NULL DEFAULT 100,
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_rescat_sort ON resource_category(sort_order);

-- ---------------------------------------------------------------------------
-- Document bodies for platform-authored templates.
--
-- `body` uses [[UPPER_SNAKE]] placeholders. `fields` describes them so a
-- preview can label them and a download can list what still has to be filled
-- in. Nothing here is ever presented as an official form: the parent row's
-- official_status is PLATFORM_TEMPLATE and the seeder refuses otherwise.
-- ---------------------------------------------------------------------------
CREATE TABLE resource_template (
  id                  INTEGER PRIMARY KEY,
  resource_id         INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  version             TEXT NOT NULL DEFAULT '1.0',
  body                TEXT NOT NULL,
  -- JSON: [{ key, label, hint? }]
  fields              TEXT NOT NULL DEFAULT '[]',
  -- JSON: [string] — what to do before using the document at all.
  before_you_use      TEXT NOT NULL DEFAULT '[]',
  -- JSON: [{ heading, body }] — the state-by-state reality.
  jurisdiction_notes  TEXT NOT NULL DEFAULT '[]',
  word_count          INTEGER NOT NULL DEFAULT 0,
  -- Rendered page count for the preview's pagination, computed at seed time.
  page_count          INTEGER NOT NULL DEFAULT 1,
  is_current          INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0,1)),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_restpl_current ON resource_template(resource_id, version);
CREATE INDEX idx_restpl_res ON resource_template(resource_id, is_current);

-- ---------------------------------------------------------------------------
-- Extra links hanging off a resource: the prescribed official form a covering
-- application accompanies, the portal a guide describes, the authority page a
-- template refers to.
-- ---------------------------------------------------------------------------
CREATE TABLE resource_link (
  id            INTEGER PRIMARY KEY,
  resource_id   INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  url           TEXT NOT NULL,
  publisher     TEXT,
  -- 'official_form'|'portal'|'authority'|'statute'|'related'
  kind          TEXT NOT NULL DEFAULT 'official_form',
  last_checked_at TEXT,
  link_state    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 100,
  created_at    TEXT NOT NULL,
  UNIQUE (resource_id, url)
);
CREATE INDEX idx_reslink_res ON resource_link(resource_id, sort_order);

-- ---------------------------------------------------------------------------
-- Harvest targets for the ingestion pipeline. A row here is a page we know
-- publishes a list of forms; the harvester reads it and proposes resources.
--
-- Kept in the database rather than in code so that adding a source is an admin
-- action with an audit trail, not a deployment.
-- ---------------------------------------------------------------------------
CREATE TABLE resource_harvest_target (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  resource_source_id INTEGER REFERENCES resource_source(id),
  authority_name    TEXT NOT NULL,
  url               TEXT NOT NULL,
  -- Which parser reads this page. 's3waas_forms_table' handles the government
  -- content platform that nearly every state authority site runs on.
  parser            TEXT NOT NULL DEFAULT 's3waas_forms_table',
  category_code     TEXT NOT NULL,
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  legal_matter_id   INTEGER REFERENCES legal_matter(id),
  forum_id          INTEGER REFERENCES forum(id),
  trust_level       INTEGER NOT NULL DEFAULT 3 CHECK (trust_level BETWEEN 1 AND 6),
  -- robots.txt outcome for this specific path, recorded before any fetch.
  robots_checked_at TEXT,
  robots_allows     INTEGER CHECK (robots_allows IN (0,1)),
  is_enabled        INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1)),
  last_run_at       TEXT,
  last_outcome      TEXT,
  last_found        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_harvest_enabled ON resource_harvest_target(is_enabled, last_run_at);

-- ---------------------------------------------------------------------------
-- A harvest run, so the pipeline is auditable in the same way ingestion runs
-- of the professional register already are.
-- ---------------------------------------------------------------------------
CREATE TABLE resource_harvest_run (
  id              INTEGER PRIMARY KEY,
  started_at      TEXT NOT NULL,
  finished_at     TEXT,
  mode            TEXT NOT NULL DEFAULT 'harvest',
  targets_run     INTEGER NOT NULL DEFAULT 0,
  discovered      INTEGER NOT NULL DEFAULT 0,
  inserted        INTEGER NOT NULL DEFAULT 0,
  duplicates      INTEGER NOT NULL DEFAULT 0,
  rejected        INTEGER NOT NULL DEFAULT 0,
  errors          INTEGER NOT NULL DEFAULT 0,
  notes           TEXT
);

-- Kits are collections; the collection table from 007 gains what a kit needs.
ALTER TABLE resource_collection ADD COLUMN state_aware INTEGER NOT NULL DEFAULT 0 CHECK (state_aware IN (0,1));
ALTER TABLE resource_collection ADD COLUMN intent_synonyms TEXT NOT NULL DEFAULT '[]';
ALTER TABLE resource_collection ADD COLUMN pull_categories TEXT NOT NULL DEFAULT '[]';
