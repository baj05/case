-- ===========================================================================
-- SITE FEEDBACK — "Rate CaseADVO", deliberately a separate dataset from the
-- `review` table. "How was this lawyer/firm/LPO?" and "How is CaseADVO
-- itself?" are two different products with two different audiences and
-- must never be blended into one aggregate or one moderation queue.
-- ===========================================================================
CREATE TABLE site_feedback (
  id                INTEGER PRIMARY KEY,
  -- Author is optional — platform feedback is open to a signed-out visitor
  -- (there is no "verified interaction" concept here the way there is for a
  -- professional review), but we still record whichever identity we have.
  author_user_id    INTEGER REFERENCES app_user(id),
  display_mode      TEXT NOT NULL DEFAULT 'anonymous' CHECK (display_mode IN ('attributed','anonymous')),
  -- Category ratings 1..5, all optional — a visitor can rate just one thing.
  rating_website       INTEGER CHECK (rating_website BETWEEN 1 AND 5),
  rating_search         INTEGER CHECK (rating_search BETWEEN 1 AND 5),
  rating_discovery      INTEGER CHECK (rating_discovery BETWEEN 1 AND 5),
  rating_booking        INTEGER CHECK (rating_booking BETWEEN 1 AND 5),
  rating_resources      INTEGER CHECK (rating_resources BETWEEN 1 AND 5),
  rating_speed          INTEGER CHECK (rating_speed BETWEEN 1 AND 5),
  rating_design         INTEGER CHECK (rating_design BETWEEN 1 AND 5),
  -- 0..10 NPS-style recommendation.
  recommend_score   INTEGER CHECK (recommend_score BETWEEN 0 AND 10),
  improvement_area  TEXT,                          -- 'navigation'|'search'|'profiles'|'reviews'|'booking'|'resources'|'payments'|'mobile'|'other'
  comment           TEXT,
  -- 'open'|'reviewed'|'actioned'|'archived' — a lightweight triage state,
  -- not a publish/reject moderation workflow (this is never public-facing).
  status            TEXT NOT NULL DEFAULT 'open',
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_site_feedback_created ON site_feedback(created_at DESC);
CREATE INDEX idx_site_feedback_status ON site_feedback(status);
