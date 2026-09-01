-- Add new columns for location search picker
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS shop_address TEXT;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS shop_directions TEXT;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS shop_phone TEXT;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS meet_at_public_landmark BOOLEAN DEFAULT FALSE;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS address_name TEXT;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS directions TEXT;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS longitude REAL;
ALTER TABLE marketplace_users ADD COLUMN IF NOT EXISTS approximate_address TEXT;
