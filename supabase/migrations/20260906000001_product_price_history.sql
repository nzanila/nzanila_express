CREATE TABLE IF NOT EXISTS public.product_price_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id integer NOT NULL REFERENCES public.new_products(id),
  actor_id integer NOT NULL REFERENCES public.marketplace_users(id),
  old_price numeric NOT NULL,
  new_price numeric NOT NULL,
  old_compare_price numeric,
  new_compare_price numeric,
  change_type text NOT NULL CHECK (change_type IN ('regular', 'discount')),
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS product_price_history_lookup ON public.product_price_history(product_id, changed_at DESC);
CREATE OR REPLACE FUNCTION public.change_product_price(p_product integer, p_actor integer, p_price numeric, p_expected numeric, p_mode text)
RETURNS SETOF public.new_products LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_product public.new_products; comparison numeric;
BEGIN
  SELECT * INTO current_product FROM public.new_products WHERE id = p_product FOR UPDATE;
  IF NOT FOUND OR current_product.seller_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  IF p_price IS NULL OR p_price <= 0 OR p_mode IS NULL OR p_mode NOT IN ('regular', 'discount') THEN RAISE EXCEPTION 'Invalid price'; END IF;
  IF current_product.base_price IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Price changed. Refresh and try again'; END IF;
  comparison := CASE WHEN p_mode = 'discount' THEN coalesce(current_product.compare_at_price, current_product.base_price) ELSE NULL END;
  IF p_mode = 'discount' AND p_price >= comparison THEN RAISE EXCEPTION 'Discount must reduce the price'; END IF;
  INSERT INTO public.product_price_history(product_id,actor_id,old_price,new_price,old_compare_price,new_compare_price,change_type)
    VALUES(p_product,p_actor,current_product.base_price,p_price,current_product.compare_at_price,comparison,p_mode);
  RETURN QUERY UPDATE public.new_products SET base_price=p_price,compare_at_price=comparison,updated_at=now() WHERE id=p_product RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.change_product_price(integer,integer,numeric,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_product_price(integer,integer,numeric,numeric,text) TO service_role;
