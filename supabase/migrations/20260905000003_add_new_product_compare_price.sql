alter table if exists public.new_products
  add column if not exists compare_at_price numeric;

comment on column public.new_products.compare_at_price is
  'Optional original price shown when a seller is running a genuine sale.';
