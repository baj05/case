-- ===========================================================================
-- Reviews can bind to a completed `booking` (packages/db/sql/005_fees_booking.sql)
-- — the real, live, fee-collecting booking flow — not only to
-- `consultation_request`/`appointment`/`matter`. A completed, paid-or-offline
-- booking is the single strongest verified-experience signal the platform
-- has, so leaving it off the review schema was a gap.
-- ===========================================================================
ALTER TABLE review ADD COLUMN booking_id INTEGER REFERENCES booking(id);
CREATE UNIQUE INDEX uq_review_one_per_booking ON review(author_user_id, booking_id)
  WHERE booking_id IS NOT NULL;
CREATE INDEX idx_review_booking ON review(booking_id);
