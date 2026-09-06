alter table if exists public.marketplace_products
  add column if not exists model text;
