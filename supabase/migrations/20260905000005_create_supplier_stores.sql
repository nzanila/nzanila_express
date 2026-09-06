-- Legacy marketplace suppliers did not have storefront records. Create one
-- storefront per supplier identity, then attach that supplier's products to it.
insert into public.stores (seller_id, name, description, slug, status, address, store_template)
select
  coalesce((select seller_id from public.stores order by id limit 1), 22),
  s.supplier_name,
  'Supplier storefront for ' || s.supplier_name,
  lower(regexp_replace(s.supplier_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-supplier',
  'active',
  'Supplier location: ' || coalesce(s.location, 'Not provided'),
  'showcase'
from (select distinct p.supplier_name, s.location from public.marketplace_products p left join public.marketplace_suppliers s on s.name = p.supplier_name) s
where not exists (select 1 from public.stores existing where lower(existing.name) = lower(s.supplier_name));

update public.marketplace_products p
set store_id = st.id
from public.stores st
where lower(st.name) = lower(p.supplier_name);
