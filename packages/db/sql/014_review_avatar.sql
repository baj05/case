-- ===========================================================================
-- Reviewer avatar — shown only when display_mode <> 'anonymous'. Either a
-- built-in preset (a static path under /img/avatars/) or an uploaded image
-- (stored as a data URL — this prototype has no blob/object storage, and a
-- client-side-compressed avatar is small enough that SQLite is a reasonable
-- home for it). NEVER trust a stored value alone at render time — the
-- application layer must still null this out whenever display_mode is
-- 'anonymous', in case a row was ever edited from attributed to anonymous.
-- ===========================================================================
ALTER TABLE review ADD COLUMN avatar_url TEXT;
