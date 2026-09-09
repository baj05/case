-- A company account previously carried nothing but a name: an assigned
-- advocate opened a brand-new engagement with zero context on who the
-- client actually is. `industry` and `about` let a company state that once,
-- at signup or afterwards, so it is there before the first conversation
-- rather than repeated on every matter.
ALTER TABLE organisation ADD COLUMN industry TEXT;
ALTER TABLE organisation ADD COLUMN about TEXT;
