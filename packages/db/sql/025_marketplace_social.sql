-- Marketplace, second pass: providers with a profile, and listings that
-- read as short posts rather than rows in a grid.
--
-- A listing gains a banner, ALT text, a delivery mode, an expiry window,
-- optional audio and a comment thread. A provider gains the things a
-- profile header needs: a handle, a bio, a banner, verification badges.
--
-- Everything here hangs off is_demo = 1 with fictional provider names.
-- Real advocates from the Bar Council register are never given invented
-- service offerings or prices: they never consented to being listed, and
-- BCI Rule 36 bars advocates from advertising or soliciting work — a
-- fabricated ad in a real advocate's name creates a professional-conduct
-- problem for *them*, not for us.
CREATE TABLE marketplace_provider (
  id              INTEGER PRIMARY KEY,
  handle          TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  headline        TEXT NOT NULL,
  bio             TEXT NOT NULL,
  city            TEXT NOT NULL,
  -- Presented as a Bar Council enrolment number. Fictional by construction:
  -- the year and sequence are outside the ranges any state bar council
  -- issues, so it cannot collide with a real advocate's enrolment.
  bar_id          TEXT NOT NULL,
  practising_since INTEGER NOT NULL,
  avatar_path     TEXT NOT NULL,
  banner_path     TEXT NOT NULL,
  -- Comma-separated badge keys: identity, bar, escrow, responsive.
  badges          TEXT NOT NULL DEFAULT '',
  followers       INTEGER NOT NULL DEFAULT 0,
  response_rate   INTEGER NOT NULL DEFAULT 0,
  languages       TEXT NOT NULL DEFAULT '',
  is_demo         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL
);

ALTER TABLE marketplace_listing ADD COLUMN provider_id INTEGER REFERENCES marketplace_provider(id);
ALTER TABLE marketplace_listing ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'chambers';
-- 'permanent', or an ISO timestamp the post stops being offered at.
ALTER TABLE marketplace_listing ADD COLUMN expires_at TEXT;
ALTER TABLE marketplace_listing ADD COLUMN banner_path TEXT;
ALTER TABLE marketplace_listing ADD COLUMN banner_alt TEXT;
ALTER TABLE marketplace_listing ADD COLUMN podcast_title TEXT;
ALTER TABLE marketplace_listing ADD COLUMN podcast_minutes INTEGER;
ALTER TABLE marketplace_listing ADD COLUMN posted_at TEXT;

CREATE INDEX idx_marketplace_listing_provider ON marketplace_listing(provider_id);

-- Threaded reviews and pre-booking questions under a service post. Kept
-- separate from the platform's real `review` table on purpose: that one is
-- tied to verified bookings against real professionals and carries a
-- professional-conduct sign-off. This is demo commentary on demo listings
-- and must never be aggregated into a real advocate's rating.
CREATE TABLE marketplace_comment (
  id             INTEGER PRIMARY KEY,
  listing_id     INTEGER NOT NULL REFERENCES marketplace_listing(id) ON DELETE CASCADE,
  parent_id      INTEGER REFERENCES marketplace_comment(id) ON DELETE CASCADE,
  author_name    TEXT NOT NULL,
  author_role    TEXT NOT NULL DEFAULT 'client',
  body           TEXT NOT NULL,
  -- A rating out of 5 makes the row a review; NULL makes it a question.
  rating         INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_marketplace_comment_listing ON marketplace_comment(listing_id, parent_id);
