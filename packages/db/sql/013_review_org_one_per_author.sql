-- ===========================================================================
-- Organisation reviews had no "one review per author" enforcement at all —
-- unlike the professional side, which enforces it via a partial unique index
-- per interaction FK (booking/consultation/appointment/matter). An
-- organisation review has none of those FKs (no org-level booking model
-- exists yet), so without this index a single account could submit
-- unlimited reviews for the same firm/LPO, each counted separately in every
-- aggregate. This is the closest equivalent available today: one review per
-- (author, organisation) pair.
-- ===========================================================================
CREATE UNIQUE INDEX uq_review_one_per_author_org ON review(author_user_id, organisation_id)
  WHERE organisation_id IS NOT NULL;
