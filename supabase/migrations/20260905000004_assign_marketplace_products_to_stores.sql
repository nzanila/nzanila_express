alter table if exists public.marketplace_products
  add column if not exists store_id integer;

-- Keep every legacy marketplace listing discoverable through a real storefront.
-- Food/agriculture listings belong with the fresh-produce store, electronics with
-- the technology store, and the remaining catalog with the general goods store.
update public.marketplace_products
set store_id = case
  when lower(category) like any (array['%food%', '%beverage%', '%agric%', '%health%']) then 1
  when lower(category) like any (array['%electronic%', '%computer%', '%phone%', '%office%']) then 2
  else 63
end
where store_id is null;

create index if not exists idx_marketplace_products_store on public.marketplace_products(store_id);
