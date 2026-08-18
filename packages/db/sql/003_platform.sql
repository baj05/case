-- ===========================================================================
-- LEXHALL — SCHEMA (part 3: identity, tenancy, transactions, trust, telemetry)
-- Phase 2/3 tables exist here so the product graph is coherent from day one.
-- Their UI is feature-flagged off; the schema costs nothing and prevents the
-- "bolt it on later" rewrite. See docs/ROADMAP.md.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- IDENTITY & TENANCY
-- ---------------------------------------------------------------------------
CREATE TABLE app_user (
  id                INTEGER PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  phone             TEXT,
  phone_verified_at TEXT,
  full_name         TEXT NOT NULL,
  -- Argon2id/scrypt hash. Never a plaintext or reversible value.
  password_hash     TEXT,
  -- Platform-level role. Tenant-scoped roles live in org_member.
  -- 'public'|'professional'|'platform_admin'|'platform_moderator'
  platform_role     TEXT NOT NULL DEFAULT 'public',
  mfa_enabled       INTEGER NOT NULL DEFAULT 0 CHECK (mfa_enabled IN (0,1)),
  locale            TEXT NOT NULL DEFAULT 'en',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  last_login_at     TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until      TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);

CREATE TABLE session (
  id                TEXT PRIMARY KEY,              -- opaque random id, not a JWT
  user_id           INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expires_at        TEXT NOT NULL,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_session_user ON session(user_id);

-- Tenant root. 'law_firm'|'chamber'|'lpo'|'corporate'|'platform'
CREATE TABLE organisation (
  id                INTEGER PRIMARY KEY,
  kind              TEXT NOT NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  country_id        INTEGER NOT NULL REFERENCES country(id),
  -- Verified email domain enables domain-based firm claiming.
  email_domain      TEXT,
  domain_verified_at TEXT,
  professional_id   INTEGER REFERENCES professional(id),  -- public listing, if any
  gstin             TEXT,
  billing_email     TEXT,
  verification_level INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);

-- Tenant membership. EVERY tenant-scoped query filters on organisation_id;
-- see docs/SECURITY.md §Tenant isolation.
CREATE TABLE org_member (
  id                INTEGER PRIMARY KEY,
  organisation_id   INTEGER NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  -- 'owner'|'admin'|'member'|'billing'|'read_only'
  role              TEXT NOT NULL,
  professional_id   INTEGER REFERENCES professional(id),
  invited_by_user_id INTEGER,
  joined_at         TEXT,
  created_at        TEXT NOT NULL,
  UNIQUE (organisation_id, user_id)
);
CREATE INDEX idx_orgmember_user ON org_member(user_id);

-- ---------------------------------------------------------------------------
-- AVAILABILITY & CONSULTATIONS
-- Phase 1 ships consultation_request (an enquiry, no payment, no fee display).
-- Phase 2 adds slot booking behind FEATURE_PAYMENTS.
-- ---------------------------------------------------------------------------
CREATE TABLE availability_rule (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  weekday           INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute      INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute        INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  -- 'video'|'audio'|'phone'|'chat'|'in_person'
  mode              TEXT NOT NULL,
  slot_minutes      INTEGER NOT NULL DEFAULT 30,
  timezone          TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at        TEXT NOT NULL,
  CHECK (end_minute > start_minute)
);
CREATE INDEX idx_avail_prof ON availability_rule(professional_id, weekday);

CREATE TABLE consultation_request (
  id                INTEGER PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,          -- human-quotable 'CR-7K2M4P'
  professional_id   INTEGER NOT NULL REFERENCES professional(id),
  requester_user_id INTEGER REFERENCES app_user(id),
  requester_name    TEXT NOT NULL,
  requester_email   TEXT NOT NULL,
  requester_phone   TEXT,
  -- Classified intake, so the professional sees a structured brief.
  practice_area_id  INTEGER REFERENCES practice_area(id),
  matter_type_id    INTEGER REFERENCES matter_type(id),
  location_id       INTEGER REFERENCES location(id),
  court_id          INTEGER REFERENCES court(id),
  -- The user's own words. Treated as confidential: never indexed, never in
  -- analytics payloads. See docs/PRIVACY.md §Matter confidentiality.
  summary           TEXT NOT NULL,
  preferred_mode    TEXT NOT NULL DEFAULT 'video',
  preferred_window  TEXT,                          -- JSON of candidate slots
  urgency           TEXT NOT NULL DEFAULT 'normal', -- 'normal'|'urgent'|'emergency'
  -- 'submitted'|'viewed'|'accepted'|'declined'|'scheduled'|'completed'
  -- |'withdrawn'|'expired'
  status            TEXT NOT NULL DEFAULT 'submitted',
  declined_reason   TEXT,
  -- Set when the request came from a search, to measure discovery quality.
  search_event_id   INTEGER,
  conflict_check_ack INTEGER NOT NULL DEFAULT 0 CHECK (conflict_check_ack IN (0,1)),
  consent_terms_at  TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  first_viewed_at   TEXT,
  responded_at      TEXT
);
CREATE INDEX idx_creq_prof ON consultation_request(professional_id, status, created_at DESC);
CREATE INDEX idx_creq_user ON consultation_request(requester_user_id, created_at DESC);
CREATE INDEX idx_creq_status ON consultation_request(status);

CREATE TABLE appointment (
  id                INTEGER PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  consultation_request_id INTEGER REFERENCES consultation_request(id),
  professional_id   INTEGER NOT NULL REFERENCES professional(id),
  client_user_id    INTEGER REFERENCES app_user(id),
  -- Always stored UTC; rendered in the viewer's timezone.
  starts_at_utc     TEXT NOT NULL,
  ends_at_utc       TEXT NOT NULL,
  display_timezone  TEXT NOT NULL,
  mode              TEXT NOT NULL,
  -- 'scheduled'|'confirmed'|'rescheduled'|'cancelled_by_client'
  -- |'cancelled_by_professional'|'no_show'|'completed'
  status            TEXT NOT NULL DEFAULT 'scheduled',
  join_url          TEXT,
  cancellation_reason TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
-- Prevents double-booking one professional for the same instant.
CREATE UNIQUE INDEX idx_appt_slot ON appointment(professional_id, starts_at_utc)
  WHERE status IN ('scheduled','confirmed','rescheduled');
CREATE INDEX idx_appt_prof_time ON appointment(professional_id, starts_at_utc);

-- ---------------------------------------------------------------------------
-- MATTER — the workspace a consultation graduates into.
-- ---------------------------------------------------------------------------
CREATE TABLE matter (
  id                INTEGER PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  organisation_id   INTEGER REFERENCES organisation(id),
  client_user_id    INTEGER REFERENCES app_user(id),
  lead_professional_id INTEGER REFERENCES professional(id),
  title             TEXT NOT NULL,
  practice_area_id  INTEGER REFERENCES practice_area(id),
  matter_type_id    INTEGER REFERENCES matter_type(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  court_id          INTEGER REFERENCES court(id),
  -- 'intake'|'open'|'active'|'on_hold'|'closed'|'archived'
  status            TEXT NOT NULL DEFAULT 'intake',
  opened_at         TEXT,
  closed_at         TEXT,
  -- Confidential. Excluded from every search index and analytics event.
  brief             TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);
CREATE INDEX idx_matter_org ON matter(organisation_id, status);
CREATE INDEX idx_matter_lead ON matter(lead_professional_id, status);

CREATE TABLE matter_participant (
  id                INTEGER PRIMARY KEY,
  matter_id         INTEGER NOT NULL REFERENCES matter(id) ON DELETE CASCADE,
  professional_id   INTEGER REFERENCES professional(id),
  user_id           INTEGER REFERENCES app_user(id),
  -- 'lead_counsel'|'assisting'|'local_counsel'|'research'|'documentation'
  -- |'specialist'|'client'|'observer'
  role              TEXT NOT NULL,
  can_view_documents INTEGER NOT NULL DEFAULT 1 CHECK (can_view_documents IN (0,1)),
  added_at          TEXT NOT NULL,
  removed_at        TEXT
);
CREATE INDEX idx_mpart_matter ON matter_participant(matter_id);

CREATE TABLE matter_event (
  id                INTEGER PRIMARY KEY,
  matter_id         INTEGER NOT NULL REFERENCES matter(id) ON DELETE CASCADE,
  actor_user_id     INTEGER,
  kind              TEXT NOT NULL,
  summary           TEXT NOT NULL,
  metadata          TEXT,
  occurred_at       TEXT NOT NULL
);
CREATE INDEX idx_mevent_matter ON matter_event(matter_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- REFERRAL (Phase 2, FEATURE_REFERRALS)
-- Deliberately has NO fee/commission column. Advocates' fee-sharing with
-- non-advocates and touting are constrained; the platform therefore models
-- referral as professional collaboration, not a paid lead. See
-- docs/COMPLIANCE_MATRIX.md C-11 before adding any monetary field here.
-- ---------------------------------------------------------------------------
CREATE TABLE referral (
  id                INTEGER PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  matter_id         INTEGER REFERENCES matter(id),
  from_professional_id INTEGER NOT NULL REFERENCES professional(id),
  to_professional_id   INTEGER NOT NULL REFERENCES professional(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  court_id          INTEGER REFERENCES court(id),
  practice_area_id  INTEGER REFERENCES practice_area(id),
  -- Redacted brief shown before acceptance; full brief only after accept.
  teaser            TEXT NOT NULL,
  full_brief        TEXT,
  urgency           TEXT NOT NULL DEFAULT 'normal',
  -- 'sent'|'viewed'|'info_requested'|'accepted'|'declined'|'expired'|'withdrawn'
  status            TEXT NOT NULL DEFAULT 'sent',
  client_consent_at TEXT,                          -- client must consent to disclosure
  responded_at      TEXT,
  decline_reason    TEXT,
  expires_at        TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_referral_to ON referral(to_professional_id, status);
CREATE INDEX idx_referral_from ON referral(from_professional_id, status);

-- ---------------------------------------------------------------------------
-- REVIEW (Phase 2, FEATURE_REVIEWS — OFF until legal sign-off)
-- Schema encodes the controls the compliance matrix requires: reviews bind to
-- a verified interaction, carry a moderation state, and grant a right of reply.
-- ---------------------------------------------------------------------------
CREATE TABLE review (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  author_user_id    INTEGER NOT NULL REFERENCES app_user(id),
  -- The interaction that entitles this person to review. NULL is not allowed
  -- in application logic: no engagement, no review.
  consultation_request_id INTEGER REFERENCES consultation_request(id),
  appointment_id    INTEGER REFERENCES appointment(id),
  matter_id         INTEGER REFERENCES matter(id),
  -- 'verified_consultation'|'verified_engagement'|'unverified'
  basis             TEXT NOT NULL,
  -- Attributed or pseudonymous. Identity is ALWAYS retained internally for
  -- accountability even when display is pseudonymous.
  display_mode      TEXT NOT NULL DEFAULT 'attributed',
  -- Structured ratings 1..5. No single vanity "star rating" is published on
  -- its own; the profile shows the breakdown. No "Top Lawyer" derivation.
  rating_communication INTEGER CHECK (rating_communication BETWEEN 1 AND 5),
  rating_responsiveness INTEGER CHECK (rating_responsiveness BETWEEN 1 AND 5),
  rating_professionalism INTEGER CHECK (rating_professionalism BETWEEN 1 AND 5),
  rating_process_clarity INTEGER CHECK (rating_process_clarity BETWEEN 1 AND 5),
  body              TEXT NOT NULL,
  -- 'pending'|'auto_flagged'|'in_review'|'published'|'rejected'|'withdrawn'
  -- |'suspended_pending_dispute'
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  moderation_note   TEXT,
  moderated_by_user_id INTEGER,
  moderated_at      TEXT,
  -- Credibility signals, admin-only. Never exposed as a public score.
  trust_signals     TEXT,                          -- JSON
  trust_score       INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);
CREATE INDEX idx_review_prof ON review(professional_id, moderation_status);
CREATE INDEX idx_review_mod ON review(moderation_status, created_at DESC);

CREATE TABLE review_response (
  id                INTEGER PRIMARY KEY,
  review_id         INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
  author_user_id    INTEGER NOT NULL REFERENCES app_user(id),
  body              TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE content_report (
  id                INTEGER PRIMARY KEY,
  -- 'review'|'professional'|'organisation'|'message'|'resource'
  subject_type      TEXT NOT NULL,
  subject_id        INTEGER NOT NULL,
  reporter_user_id  INTEGER,
  reporter_email    TEXT,
  -- 'defamatory'|'confidential_disclosure'|'impersonation'|'fake_review'
  -- |'incorrect_information'|'spam'|'privacy'|'other'
  reason            TEXT NOT NULL,
  detail            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open',
  priority          TEXT NOT NULL DEFAULT 'normal',
  handled_by_user_id INTEGER,
  resolved_at       TEXT,
  resolution_note   TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_report_status ON content_report(status, priority, created_at DESC);

-- ---------------------------------------------------------------------------
-- BILLING (Phase 2/3). Ledger-style: money events are append-only.
-- ---------------------------------------------------------------------------
CREATE TABLE plan (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  -- 'free'|'professional'|'law_firm'|'enterprise'|'lpo'
  tier              TEXT NOT NULL,
  audience          TEXT NOT NULL,
  currency_code     TEXT NOT NULL DEFAULT 'INR',
  price_minor       INTEGER NOT NULL DEFAULT 0,     -- paise; integers only
  interval          TEXT NOT NULL DEFAULT 'month',
  entitlements      TEXT NOT NULL,                  -- JSON
  -- Enforced invariant: no plan may buy search ranking. ADR-009.
  grants_ranking_boost INTEGER NOT NULL DEFAULT 0
    CHECK (grants_ranking_boost = 0),
  is_public         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL
);

CREATE TABLE subscription (
  id                INTEGER PRIMARY KEY,
  organisation_id   INTEGER REFERENCES organisation(id),
  user_id           INTEGER REFERENCES app_user(id),
  plan_id           INTEGER NOT NULL REFERENCES plan(id),
  status            TEXT NOT NULL DEFAULT 'trialing',
  current_period_start TEXT,
  current_period_end   TEXT,
  cancel_at         TEXT,
  cancelled_at      TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE ledger_entry (
  id                INTEGER PRIMARY KEY,
  -- Append-only. Corrections are new opposing entries, never updates.
  organisation_id   INTEGER REFERENCES organisation(id),
  user_id           INTEGER REFERENCES app_user(id),
  subscription_id   INTEGER REFERENCES subscription(id),
  consultation_request_id INTEGER REFERENCES consultation_request(id),
  -- 'charge'|'refund'|'payout'|'adjustment'|'tax'
  kind              TEXT NOT NULL,
  currency_code     TEXT NOT NULL,
  amount_minor      INTEGER NOT NULL,
  tax_minor         INTEGER NOT NULL DEFAULT 0,
  -- Abstracted away from any single processor. ADR-007.
  provider          TEXT,
  provider_ref      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  occurred_at       TEXT NOT NULL,
  metadata          TEXT
);
CREATE INDEX idx_ledger_org ON ledger_entry(organisation_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- KNOWLEDGE — judgments and resources. Factual only, no judge scoring.
-- ---------------------------------------------------------------------------
CREATE TABLE judge (
  id                INTEGER PRIMARY KEY,
  full_name         TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  court_id          INTEGER REFERENCES court(id),
  designation       TEXT,
  tenure_start      TEXT,
  tenure_end        TEXT,
  source_url        TEXT,
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
  -- Deliberately absent: any rating, score, ranking or sentiment column.
  -- docs/COMPLIANCE_MATRIX.md C-14.
);

CREATE TABLE judgment (
  id                INTEGER PRIMARY KEY,
  court_id          INTEGER REFERENCES court(id),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  neutral_citation  TEXT,
  reported_citation TEXT,
  decided_on        TEXT,
  bench             TEXT,
  headnote          TEXT,
  full_text_url     TEXT,
  source_id         INTEGER REFERENCES source(id),
  source_url        TEXT,
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_judgment_court ON judgment(court_id, decided_on DESC);

CREATE TABLE judgment_practice_area (
  judgment_id       INTEGER NOT NULL REFERENCES judgment(id) ON DELETE CASCADE,
  practice_area_id  INTEGER NOT NULL REFERENCES practice_area(id) ON DELETE CASCADE,
  PRIMARY KEY (judgment_id, practice_area_id)
);

CREATE TABLE resource (
  id                INTEGER PRIMARY KEY,
  kind              TEXT NOT NULL,                 -- 'guide'|'template'|'checklist'|'faq'
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  summary           TEXT NOT NULL,
  body_markdown     TEXT,
  practice_area_id  INTEGER REFERENCES practice_area(id),
  jurisdiction_id   INTEGER REFERENCES jurisdiction(id),
  -- Every template and guide must carry a disclaimer and a version.
  disclaimer        TEXT NOT NULL,
  version           TEXT NOT NULL DEFAULT '1.0',
  reviewed_by       TEXT,
  reviewed_at       TEXT,
  is_published      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_resource_pa ON resource(practice_area_id, is_published);

-- ---------------------------------------------------------------------------
-- TELEMETRY & TRUST INFRASTRUCTURE
-- ---------------------------------------------------------------------------
-- Zero-result intelligence (spec §112). Stores the QUERY, never a matter brief.
CREATE TABLE search_event (
  id                INTEGER PRIMARY KEY,
  session_ref       TEXT,                          -- rotating pseudonymous id
  user_id           INTEGER REFERENCES app_user(id),
  raw_query         TEXT,
  -- What the intake classifier concluded, so we can audit its accuracy.
  parsed            TEXT,                          -- JSON
  filters           TEXT,                          -- JSON
  result_count      INTEGER NOT NULL,
  top_result_professional_id INTEGER,
  latency_ms        INTEGER,
  clicked_position  INTEGER,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_search_zero ON search_event(result_count, created_at DESC);
CREATE INDEX idx_search_created ON search_event(created_at DESC);

CREATE TABLE saved_item (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,                 -- 'professional'|'judgment'|'resource'
  subject_id        INTEGER NOT NULL,
  note              TEXT,
  created_at        TEXT NOT NULL,
  UNIQUE (user_id, kind, subject_id)
);

CREATE TABLE saved_search (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  query_string      TEXT NOT NULL,                 -- canonical URL query
  alert_frequency   TEXT NOT NULL DEFAULT 'none',  -- 'none'|'daily'|'weekly'
  last_alerted_at   TEXT,
  created_at        TEXT NOT NULL
);

CREATE TABLE notification (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  title             TEXT NOT NULL,
  body             TEXT NOT NULL,
  link_url          TEXT,
  channels_sent     TEXT,                          -- JSON: ['in_app','email']
  read_at           TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_notif_user ON notification(user_id, read_at, created_at DESC);

-- Append-only audit trail for sensitive actions (spec §127).
CREATE TABLE audit_log (
  id                INTEGER PRIMARY KEY,
  actor_user_id     INTEGER,
  actor_role        TEXT,
  action            TEXT NOT NULL,                 -- 'verification.granted'
  subject_type      TEXT NOT NULL,
  subject_id        INTEGER,
  before_state      TEXT,                          -- JSON
  after_state       TEXT,                          -- JSON
  reason            TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_audit_subject ON audit_log(subject_type, subject_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_user_id, created_at DESC);

CREATE TABLE feature_flag (
  key               TEXT PRIMARY KEY,
  enabled           INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  description       TEXT NOT NULL,
  -- Why it is off, and what must be true to turn it on.
  gate_note         TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
