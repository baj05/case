-- ===========================================================================
-- LEXHALL — FEE SCHEDULES AND BOOKING (Phase 2)
--
-- COMPLIANCE POSTURE (docs/COMPLIANCE_MATRIX.md C-12, revised):
-- Fee display and on-platform booking were requested explicitly and
-- reaffirmed. Two invariants keep this defensible:
--
--   1. A fee is ALWAYS advocate-declared. There is no platform-set price and
--      no inferred price. If an advocate has not entered a fee, none is shown.
--   2. The platform takes NO share. platform_fee_minor is CHECK-constrained to
--      0, the same mechanism used for paid ranking in ADR-009. Commission,
--      lead fees and percentage splits are the part of C-12 that carries real
--      professional-conduct risk, so they are made structurally impossible.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- FEE SCHEDULE — one row per service an advocate offers.
-- Integer minor units only (paise), never floats.
-- ---------------------------------------------------------------------------
CREATE TABLE fee_schedule (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  -- 'consultation' | 'filing' | 'appearance' | 'drafting' | 'review'
  -- | 'opinion' | 'retainer' | 'compliance'
  kind              TEXT NOT NULL,
  label             TEXT NOT NULL,
  -- Consultation-only: which mode and how long this price covers.
  mode              TEXT,                    -- 'video'|'audio'|'phone'|'chat'|'in_person'
  duration_minutes  INTEGER,
  currency_code     TEXT NOT NULL DEFAULT 'INR',
  amount_minor      INTEGER NOT NULL CHECK (amount_minor >= 0),
  -- Some services are quoted as a range or on request rather than fixed.
  -- 'fixed' | 'from' | 'range' | 'on_request' | 'hourly'
  basis             TEXT NOT NULL DEFAULT 'fixed',
  amount_max_minor  INTEGER CHECK (amount_max_minor IS NULL OR amount_max_minor >= amount_minor),
  -- What the fee does and does not include, in the advocate's own words.
  includes          TEXT,
  excludes          TEXT,
  -- Court/statutory charges the client pays in addition. Disclosed separately
  -- so a quoted fee is never mistaken for the total cost.
  is_statutory_passthrough INTEGER NOT NULL DEFAULT 0 CHECK (is_statutory_passthrough IN (0,1)),
  -- Tax treatment is the advocate's responsibility; we only record what they
  -- declare so the client is not surprised.
  tax_note          TEXT,
  court_id          INTEGER REFERENCES court(id),
  practice_area_id  INTEGER REFERENCES practice_area(id),
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order        INTEGER NOT NULL DEFAULT 100,
  -- Provenance: a fee is self-declared by definition. Recorded explicitly so
  -- the UI can label it rather than implying we verified it.
  declared_by_user_id INTEGER,
  declared_at       TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_fee_prof ON fee_schedule(professional_id, is_active, sort_order);
CREATE INDEX idx_fee_kind ON fee_schedule(kind, is_active);
CREATE INDEX idx_fee_amount ON fee_schedule(amount_minor);

-- Denormalised "cheapest active consultation fee" per professional, so search
-- can sort by price without a correlated subquery per row.
CREATE TABLE professional_fee_summary (
  professional_id     INTEGER PRIMARY KEY REFERENCES professional(id) ON DELETE CASCADE,
  currency_code       TEXT NOT NULL DEFAULT 'INR',
  min_consult_minor   INTEGER,
  max_consult_minor   INTEGER,
  has_filing_fees     INTEGER NOT NULL DEFAULT 0,
  service_count       INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT NOT NULL
);
CREATE INDEX idx_feesum_min ON professional_fee_summary(min_consult_minor);

-- ---------------------------------------------------------------------------
-- BOOKING — a slot actually held, as distinct from consultation_request which
-- is a speculative enquiry. A booking has a price and a definite time.
-- ---------------------------------------------------------------------------
CREATE TABLE booking (
  id                INTEGER PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,        -- 'BK-3F7K2M'
  professional_id   INTEGER NOT NULL REFERENCES professional(id),
  client_user_id    INTEGER REFERENCES app_user(id),
  fee_schedule_id   INTEGER REFERENCES fee_schedule(id),
  consultation_request_id INTEGER REFERENCES consultation_request(id),

  client_name       TEXT NOT NULL,
  client_email      TEXT NOT NULL,
  client_phone      TEXT,

  -- Always stored UTC; rendered in the viewer's zone. Spec §15, §61.
  starts_at_utc     TEXT NOT NULL,
  ends_at_utc       TEXT NOT NULL,
  client_timezone   TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  mode              TEXT NOT NULL,

  practice_area_id  INTEGER REFERENCES practice_area(id),
  matter_type_id    INTEGER REFERENCES matter_type(id),
  court_id          INTEGER REFERENCES court(id),
  -- Confidential. Excluded from every index, same treatment as matter.brief.
  brief             TEXT NOT NULL,
  urgency           TEXT NOT NULL DEFAULT 'normal',

  -- Money, captured at booking time so a later fee change cannot rewrite what
  -- the client was quoted.
  currency_code     TEXT NOT NULL DEFAULT 'INR',
  quoted_fee_minor  INTEGER NOT NULL DEFAULT 0,
  statutory_charges_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor         INTEGER NOT NULL DEFAULT 0,
  total_minor       INTEGER NOT NULL DEFAULT 0,
  -- The platform's cut. Structurally zero. See the header note.
  platform_fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_minor = 0),
  -- 'collect_offline' : advocate collects directly (current default)
  -- 'gateway'         : captured on platform (blocked pending C-12 sign-off)
  settlement_mode   TEXT NOT NULL DEFAULT 'collect_offline',
  -- 'unpaid'|'paid_offline'|'authorised'|'captured'|'refunded'|'failed'
  payment_status    TEXT NOT NULL DEFAULT 'unpaid',

  -- 'pending'|'confirmed'|'declined'|'cancelled_by_client'
  -- |'cancelled_by_professional'|'rescheduled'|'completed'|'no_show'|'expired'
  status            TEXT NOT NULL DEFAULT 'pending',
  decline_reason    TEXT,
  cancel_reason     TEXT,
  rescheduled_to_id INTEGER REFERENCES booking(id),

  fee_disclosure_ack INTEGER NOT NULL DEFAULT 0 CHECK (fee_disclosure_ack IN (0,1)),
  terms_ack_at      TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  confirmed_at      TEXT,
  completed_at      TEXT
);
-- One advocate cannot hold two live bookings for the same instant.
CREATE UNIQUE INDEX idx_booking_slot ON booking(professional_id, starts_at_utc)
  WHERE status IN ('pending','confirmed','rescheduled');
CREATE INDEX idx_booking_prof ON booking(professional_id, starts_at_utc);
CREATE INDEX idx_booking_status ON booking(status, created_at DESC);
CREATE INDEX idx_booking_client ON booking(client_email, created_at DESC);

CREATE TABLE booking_event (
  id                INTEGER PRIMARY KEY,
  booking_id        INTEGER NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  detail            TEXT NOT NULL,
  actor             TEXT NOT NULL DEFAULT 'system',
  occurred_at       TEXT NOT NULL
);
CREATE INDEX idx_bkevent ON booking_event(booking_id, occurred_at DESC);

-- Explicit blocks: leave, court days, anything that overrides availability.
CREATE TABLE availability_block (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  starts_at_utc     TEXT NOT NULL,
  ends_at_utc       TEXT NOT NULL,
  reason            TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_block_prof ON availability_block(professional_id, starts_at_utc);

-- ---------------------------------------------------------------------------
-- ADVO AI — conversational intake sessions.
-- Deterministic classifier, not a language model (ADR-006). Sessions are
-- stored so the routing can be audited and the vocabulary improved from real
-- transcripts rather than guesswork.
-- ---------------------------------------------------------------------------
CREATE TABLE intake_session (
  id                INTEGER PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  session_ref       TEXT,
  -- Everything the user said, plus what we asked and concluded.
  transcript        TEXT NOT NULL,            -- JSON array of turns
  -- Structured outcome.
  practice_area_id  INTEGER REFERENCES practice_area(id),
  matter_type_id    INTEGER REFERENCES matter_type(id),
  location_id       INTEGER REFERENCES location(id),
  court_id          INTEGER REFERENCES court(id),
  urgency           TEXT NOT NULL DEFAULT 'normal',
  budget_max_minor  INTEGER,
  min_experience_years INTEGER,
  -- 'asking' | 'routed' | 'abandoned'
  status            TEXT NOT NULL DEFAULT 'asking',
  result_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_intake_status ON intake_session(status, created_at DESC);
