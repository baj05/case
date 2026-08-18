-- ===========================================================================
-- LEXHALL — SEARCH INDEX
--
-- FTS5 external-content table: the index stores no duplicate copy of the row,
-- it points back at professional_search_doc. Triggers keep it in lockstep.
--
-- IMPORTANT: only publishable, non-confidential text enters this index.
-- Matter briefs, consultation summaries and private_* contact fields are
-- structurally excluded. docs/PRIVACY.md §Index separation.
-- ===========================================================================

-- Flattened, denormalised search document. Rebuilt by the indexer rather than
-- joined at query time, so a search is one FTS match plus one filter pass.
CREATE TABLE professional_search_doc (
  professional_id   INTEGER PRIMARY KEY REFERENCES professional(id) ON DELETE CASCADE,
  -- searchable text, weighted by column in the FTS table below
  name_text         TEXT NOT NULL DEFAULT '',
  role_text         TEXT NOT NULL DEFAULT '',
  practice_text     TEXT NOT NULL DEFAULT '',
  court_text        TEXT NOT NULL DEFAULT '',
  location_text     TEXT NOT NULL DEFAULT '',
  body_text         TEXT NOT NULL DEFAULT '',
  -- denormalised scalars for filtering without joins
  kind              TEXT NOT NULL,
  country_id        INTEGER NOT NULL,
  jurisdiction_id   INTEGER,
  location_path     TEXT NOT NULL DEFAULT '',
  practice_area_ids TEXT NOT NULL DEFAULT '',      -- ',3,17,'  substring-matchable
  court_ids         TEXT NOT NULL DEFAULT '',
  court_tiers       TEXT NOT NULL DEFAULT '',
  language_ids      TEXT NOT NULL DEFAULT '',
  matter_type_ids   TEXT NOT NULL DEFAULT '',
  verification_level INTEGER NOT NULL DEFAULT 0,
  claim_status      TEXT NOT NULL,
  accepts_consultations INTEGER NOT NULL DEFAULT 0,
  years_experience  INTEGER,
  data_confidence   INTEGER NOT NULL DEFAULT 50,
  is_published      INTEGER NOT NULL DEFAULT 0,
  profile_completeness INTEGER NOT NULL DEFAULT 0, -- 0..100
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_psd_filter ON professional_search_doc(is_published, kind, jurisdiction_id);
CREATE INDEX idx_psd_path ON professional_search_doc(location_path);
CREATE INDEX idx_psd_verif ON professional_search_doc(verification_level);

CREATE VIRTUAL TABLE professional_fts USING fts5(
  name_text,
  role_text,
  practice_text,
  court_text,
  location_text,
  body_text,
  content='professional_search_doc',
  content_rowid='professional_id',
  tokenize="unicode61 remove_diacritics 2"
);

-- Keep FTS in sync. External-content tables need explicit delete/insert of the
-- old values, hence the 'delete' command rows.
CREATE TRIGGER psd_ai AFTER INSERT ON professional_search_doc BEGIN
  INSERT INTO professional_fts(rowid, name_text, role_text, practice_text, court_text, location_text, body_text)
  VALUES (new.professional_id, new.name_text, new.role_text, new.practice_text, new.court_text, new.location_text, new.body_text);
END;

CREATE TRIGGER psd_ad AFTER DELETE ON professional_search_doc BEGIN
  INSERT INTO professional_fts(professional_fts, rowid, name_text, role_text, practice_text, court_text, location_text, body_text)
  VALUES ('delete', old.professional_id, old.name_text, old.role_text, old.practice_text, old.court_text, old.location_text, old.body_text);
END;

CREATE TRIGGER psd_au AFTER UPDATE ON professional_search_doc BEGIN
  INSERT INTO professional_fts(professional_fts, rowid, name_text, role_text, practice_text, court_text, location_text, body_text)
  VALUES ('delete', old.professional_id, old.name_text, old.role_text, old.practice_text, old.court_text, old.location_text, old.body_text);
  INSERT INTO professional_fts(rowid, name_text, role_text, practice_text, court_text, location_text, body_text)
  VALUES (new.professional_id, new.name_text, new.role_text, new.practice_text, new.court_text, new.location_text, new.body_text);
END;

-- Autocomplete corpus: professionals, locations, courts, practice areas and
-- firms in one prefix-searchable table so the suggest endpoint is a single query.
CREATE TABLE suggest_term (
  id                INTEGER PRIMARY KEY,
  -- 'practice_area'|'location'|'court'|'professional'|'organisation'|'matter_type'
  kind              TEXT NOT NULL,
  subject_id        INTEGER,
  label             TEXT NOT NULL,
  sublabel          TEXT,
  -- lowercased, unaccented, for LIKE 'q%' prefix matching
  match_key         TEXT NOT NULL,
  href              TEXT NOT NULL,
  -- Higher wins. Derived from corpus size, not from money.
  weight            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_suggest_key ON suggest_term(match_key, weight DESC);
CREATE INDEX idx_suggest_kind ON suggest_term(kind, weight DESC);
