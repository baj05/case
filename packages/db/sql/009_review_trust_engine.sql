-- ===========================================================================
-- REVIEW TRUST ENGINE — additive extension of the review/review_response
-- schema in 003_platform.sql. Still gated behind FEATURE_REVIEWS (C-09) and
-- FEATURE_ANONYMOUS_REVIEWS (C-10) — this migration makes the schema capable
-- of the full experience-review model the product brief calls for; it does
-- not itself turn anything on.
--
-- What 003_platform.sql already covers, not repeated here: verified-
-- interaction binding (basis), moderation workflow, right of reply
-- (review_response), generic reporting (content_report), admin-only fraud
-- signals (trust_signals/trust_score).
--
-- What this migration adds:
--   1. would_recommend + overall_satisfaction — a recommend signal and a
--      single "how did this feel overall" rating, distinct from the four
--      experience-dimension ratings that already exist.
--   2. reviewer_type — internal classification (client/lawyer/corporate/…),
--      only ever surfaced publicly where the compliance review says it may be.
--   3. One-experience-per-review — enforced as partial unique indexes, not
--      just application logic, so it holds even if a bug ships.
--   4. review_edit_history — edits change the live row but never destroy the
--      prior text; every version is retained internally.
--   5. review_vote — "helpful / not helpful", one vote per user per review.
-- ===========================================================================

ALTER TABLE review ADD COLUMN would_recommend TEXT CHECK (would_recommend IN ('yes','no','maybe'));
ALTER TABLE review ADD COLUMN overall_satisfaction INTEGER CHECK (overall_satisfaction BETWEEN 1 AND 5);
-- 'client'|'former_client'|'current_client'|'lawyer'|'referring_lawyer'
-- |'corporate_legal_team'|'vendor'|'other'
ALTER TABLE review ADD COLUMN reviewer_type TEXT NOT NULL DEFAULT 'client';
-- Free-text label the author chose for the interaction, e.g. "Consultation",
-- "Property matter" — kept separate from the FK columns so the review form
-- can ask "what kind of experience was this?" even for edge cases the three
-- FKs don't cover cleanly.
ALTER TABLE review ADD COLUMN experience_category TEXT NOT NULL DEFAULT 'consultation';
ALTER TABLE review ADD COLUMN edited_at TEXT;
ALTER TABLE review ADD COLUMN edit_count INTEGER NOT NULL DEFAULT 0;

-- One review per verified experience (spec: "one-experience rule"). A NULL
-- FK never collides with itself under a UNIQUE index, hence three partial
-- indexes rather than one composite — exactly one of the three FKs is set
-- per review by application logic.
CREATE UNIQUE INDEX uq_review_one_per_consult ON review(author_user_id, consultation_request_id)
  WHERE consultation_request_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_one_per_appt ON review(author_user_id, appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_one_per_matter ON review(author_user_id, matter_id)
  WHERE matter_id IS NOT NULL;

-- Edits are allowed; silent rewrites of history are not. Every prior version
-- of the body/ratings is captured here before the live row changes.
CREATE TABLE review_edit_history (
  id                INTEGER PRIMARY KEY,
  review_id         INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
  prior_body        TEXT NOT NULL,
  prior_ratings     TEXT NOT NULL,                  -- JSON snapshot of all rating_* + overall_satisfaction + would_recommend
  edited_at         TEXT NOT NULL
);
CREATE INDEX idx_review_edit_history ON review_edit_history(review_id, edited_at DESC);

-- Helpful / not-helpful voting. Rate-limited to one vote per user per review
-- by the UNIQUE constraint; changing your vote is an UPDATE, not a new row.
CREATE TABLE review_vote (
  id                INTEGER PRIMARY KEY,
  review_id         INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  vote              INTEGER NOT NULL CHECK (vote IN (1,-1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE(review_id, user_id)
);
CREATE INDEX idx_review_vote_review ON review_vote(review_id);
