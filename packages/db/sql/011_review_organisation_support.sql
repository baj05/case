-- ===========================================================================
-- Reviews for law firms and LPO providers (organisation.kind IN
-- ('law_firm','chamber','lpo')), not just individual advocates.
--
-- SQLite cannot relax a NOT NULL/CHECK constraint with ALTER TABLE, so this
-- rebuilds `review` with `professional_id` made nullable and a new nullable
-- `organisation_id` added — exactly one of the two must be set, enforced by
-- a CHECK, mirroring how exactly one interaction FK is already required by
-- application logic. review_edit_history and review_vote reference
-- review(id) by name only, so they survive the rebuild untouched.
-- ===========================================================================
CREATE TABLE review_new (
  id                INTEGER PRIMARY KEY,
  professional_id   INTEGER REFERENCES professional(id) ON DELETE CASCADE,
  organisation_id   INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
  author_user_id    INTEGER NOT NULL REFERENCES app_user(id),
  consultation_request_id INTEGER REFERENCES consultation_request(id),
  appointment_id    INTEGER REFERENCES appointment(id),
  matter_id         INTEGER REFERENCES matter(id),
  booking_id        INTEGER REFERENCES booking(id),
  basis             TEXT NOT NULL,
  display_mode      TEXT NOT NULL DEFAULT 'attributed',
  rating_communication INTEGER CHECK (rating_communication BETWEEN 1 AND 5),
  rating_responsiveness INTEGER CHECK (rating_responsiveness BETWEEN 1 AND 5),
  rating_professionalism INTEGER CHECK (rating_professionalism BETWEEN 1 AND 5),
  rating_process_clarity INTEGER CHECK (rating_process_clarity BETWEEN 1 AND 5),
  would_recommend TEXT CHECK (would_recommend IN ('yes','no','maybe')),
  overall_satisfaction INTEGER CHECK (overall_satisfaction BETWEEN 1 AND 5),
  reviewer_type TEXT NOT NULL DEFAULT 'client',
  experience_category TEXT NOT NULL DEFAULT 'consultation',
  body              TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  moderation_note   TEXT,
  moderated_by_user_id INTEGER,
  moderated_at      TEXT,
  trust_signals     TEXT,
  trust_score       INTEGER NOT NULL DEFAULT 0,
  edited_at         TEXT,
  edit_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT,
  CHECK ((professional_id IS NOT NULL) <> (organisation_id IS NOT NULL))
);
INSERT INTO review_new (
  id, professional_id, organisation_id, author_user_id, consultation_request_id, appointment_id,
  matter_id, booking_id, basis, display_mode, rating_communication, rating_responsiveness,
  rating_professionalism, rating_process_clarity, would_recommend, overall_satisfaction,
  reviewer_type, experience_category, body, moderation_status, moderation_note,
  moderated_by_user_id, moderated_at, trust_signals, trust_score, edited_at, edit_count,
  created_at, updated_at, deleted_at
)
SELECT id, professional_id, NULL, author_user_id, consultation_request_id, appointment_id,
  matter_id, booking_id, basis, display_mode, rating_communication, rating_responsiveness,
  rating_professionalism, rating_process_clarity, would_recommend, overall_satisfaction,
  reviewer_type, experience_category, body, moderation_status, moderation_note,
  moderated_by_user_id, moderated_at, trust_signals, trust_score, edited_at, edit_count,
  created_at, updated_at, deleted_at
FROM review;

DROP TABLE review;
ALTER TABLE review_new RENAME TO review;

CREATE INDEX idx_review_prof ON review(professional_id, moderation_status);
CREATE INDEX idx_review_org ON review(organisation_id, moderation_status);
CREATE INDEX idx_review_mod ON review(moderation_status, created_at DESC);
CREATE INDEX idx_review_booking ON review(booking_id);
CREATE UNIQUE INDEX uq_review_one_per_consult ON review(author_user_id, consultation_request_id)
  WHERE consultation_request_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_one_per_appt ON review(author_user_id, appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_one_per_matter ON review(author_user_id, matter_id)
  WHERE matter_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_one_per_booking ON review(author_user_id, booking_id)
  WHERE booking_id IS NOT NULL;
