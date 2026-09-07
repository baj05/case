-- ===========================================================================
-- Case-listing derived directory entries (spec: eCourts public-scrape ingest)
-- ===========================================================================

-- How many distinct cases an advocate's name was seen across in the scraped
-- sample. A frequency signal for the UI/filters, not a claim of exhaustive
-- case history (the underlying scrape is a partial sample, never a census).
ALTER TABLE professional ADD COLUMN source_mention_count INTEGER;
