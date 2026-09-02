-- Storefront builder configuration (full builder state persisted per store)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS storefront_config JSONB DEFAULT '{}'::jsonb;
