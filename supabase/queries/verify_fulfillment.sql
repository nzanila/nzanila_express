-- Run in Supabase SQL Editor after applying the migration.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'marketplace_orders'
  AND column_name IN ('fulfillment_method', 'delivery_photo', 'terms_accepted')
ORDER BY column_name;

-- Expected: three rows. This confirms pickup/delivery choice, location photo,
-- and buyer terms acceptance are persisted by the backend.
