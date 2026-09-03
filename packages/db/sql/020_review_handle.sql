-- Optional, reviewer-chosen display handle (e.g. "legal_eagle_22"), shown as
-- "@handle" on the card. Purely cosmetic: never used for lookup, login, or
-- deduplication, so no uniqueness constraint. Independent of display_mode —
-- an anonymous reviewer may still pick a handle; it identifies nothing real.
ALTER TABLE review ADD COLUMN handle TEXT;
