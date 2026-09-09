-- CaseADVO Marketplace: a Facebook-Marketplace-shaped listing grid for
-- discrete legal services (a document, a notarisation, an urgent
-- consultation) rather than a full advocate profile.
--
-- Every row here is demonstration data (is_demo = 1 always, for now) with a
-- fictional provider_name — never a real registered advocate's name or
-- photo. Attaching a fabricated price and availability window to a real,
-- named professional from the register would misrepresent a real person;
-- the same reason the homepage's illustrative booking cards use invented
-- names instead of real ones. A "Book now" click routes to the real,
-- verified directory, not to a transaction with a fictional provider.
CREATE TABLE marketplace_listing (
  id                  INTEGER PRIMARY KEY,
  -- Deterministic per-seed-run key ('demo-001' etc.), not a display value —
  -- lets the seeder use INSERT OR IGNORE and be safely re-run, the same
  -- idempotency pattern the resource-library and taxonomy seeders already use.
  seed_key            TEXT NOT NULL UNIQUE,
  category            TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  provider_name       TEXT NOT NULL,
  practice_area_id    INTEGER REFERENCES practice_area(id),
  price_minor         INTEGER NOT NULL,
  currency_code       TEXT NOT NULL DEFAULT 'INR',
  price_basis         TEXT NOT NULL CHECK (price_basis IN ('fixed', 'hourly', 'starting_at')),
  location_name       TEXT NOT NULL,
  latitude            REAL NOT NULL,
  longitude           REAL NOT NULL,
  geofence_radius_km  INTEGER NOT NULL,
  availability_label  TEXT NOT NULL,
  response_minutes    INTEGER,
  is_demo             INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1)),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX idx_marketplace_category ON marketplace_listing(category);
CREATE INDEX idx_marketplace_practice_area ON marketplace_listing(practice_area_id);
