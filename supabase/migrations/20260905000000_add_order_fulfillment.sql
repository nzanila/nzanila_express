-- Buyer/seller fulfillment details. Safe for existing installations.
ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS fulfillment_method TEXT NOT NULL DEFAULT 'seller_delivery',
  ADD COLUMN IF NOT EXISTS delivery_photo TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
