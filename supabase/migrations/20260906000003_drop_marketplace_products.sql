-- Drop the legacy marketplace_products table.
-- All product data now lives in new_products.
DROP TABLE IF EXISTS public.marketplace_products CASCADE;
