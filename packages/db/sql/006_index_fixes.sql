-- ===========================================================================
-- Index gaps found by the forensic audit (docs/DATABASE_AUDIT.md).
-- Each of these tables is read by a foreign key with no supporting index, so
-- the lookup was a full scan. Small today, a problem at scale.
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_review_response_review ON review_response(review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_search_user ON saved_search(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_search_alert ON saved_search(alert_frequency, last_alerted_at);
CREATE INDEX IF NOT EXISTS idx_subscription_org ON subscription(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_period ON subscription(current_period_end);

-- Hot-path composites the audit's query sampling exposed.
CREATE INDEX IF NOT EXISTS idx_fee_prof_kind ON fee_schedule(professional_id, kind, is_active);
CREATE INDEX IF NOT EXISTS idx_booking_prof_status ON booking(professional_id, status, starts_at_utc);
CREATE INDEX IF NOT EXISTS idx_judge_court ON judge(court_id, full_name);
CREATE INDEX IF NOT EXISTS idx_raw_source_state ON raw_record(source_id, state, captured_at DESC);
