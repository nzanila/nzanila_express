-- Persist the seller's Store Builder template and section arrangement.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS store_template TEXT NOT NULL DEFAULT 'showcase',
  ADD COLUMN IF NOT EXISTS store_sections JSONB NOT NULL DEFAULT '["hero","categories","featured","story","videos","certificates","events"]'::jsonb;
