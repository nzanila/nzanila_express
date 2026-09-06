-- Store-specific pinpoint location for multi-store sellers.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS latitude REAL,
  ADD COLUMN IF NOT EXISTS longitude REAL,
  ADD COLUMN IF NOT EXISTS location_address TEXT;

CREATE INDEX IF NOT EXISTS stores_lat_lng_idx ON stores (latitude, longitude);
