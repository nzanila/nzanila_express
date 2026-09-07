-- Persist the exact OpenStreetMap checkout pin and an explicit shipping amount.
ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC NOT NULL DEFAULT 0;
