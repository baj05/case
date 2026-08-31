-- ===========================================================================
-- DOCUMENT BUILDER — fill-event and AI-extraction telemetry.
--
-- Both tables below are COUNTS ONLY. Neither ever stores a field value, a
-- filled document body, or free-text prose — the wizard is explicitly
-- designed not to persist a half-completed contract server-side (see
-- document-fill.ts / the Corporate Suite plan), and extraction output must
-- be confirmable-then-discardable without leaving a copy behind. These rows
-- exist purely to answer "is this feature used, and does it work" — not to
-- reconstruct what anyone typed.
-- ===========================================================================

-- `resource_template.fields` already carries richer per-field JSON
-- (type/required/options — see document-fields.ts) than when this column
-- was first seeded. Bumping the version lets a future reader of the table
-- tell "was this row seeded with type inference" without inspecting JSON.
ALTER TABLE resource_template ADD COLUMN fields_schema_version INTEGER NOT NULL DEFAULT 2;

CREATE TABLE document_fill (
  id                INTEGER PRIMARY KEY,
  resource_id       INTEGER NOT NULL REFERENCES resource(id),
  template_version  TEXT NOT NULL,
  format            TEXT NOT NULL,                 -- 'docx'|'txt'
  field_count       INTEGER NOT NULL,
  filled_count      INTEGER NOT NULL,
  left_open_count   INTEGER NOT NULL,
  mode              TEXT NOT NULL CHECK (mode IN ('manual','ai_assisted')),
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_docfill_resource ON document_fill(resource_id, created_at DESC);

CREATE TABLE ai_field_extraction (
  id                INTEGER PRIMARY KEY,
  resource_id       INTEGER NOT NULL REFERENCES resource(id),
  prompt_chars      INTEGER NOT NULL,
  fields_offered    INTEGER NOT NULL,
  fields_returned   INTEGER NOT NULL,
  low_confidence    INTEGER NOT NULL,
  rejected          INTEGER NOT NULL,
  model             TEXT NOT NULL,
  latency_ms        INTEGER NOT NULL,
  outcome           TEXT NOT NULL,                 -- 'ok'|'timeout'|'error'|'empty'
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_aiextract_resource ON ai_field_extraction(resource_id, created_at DESC);
