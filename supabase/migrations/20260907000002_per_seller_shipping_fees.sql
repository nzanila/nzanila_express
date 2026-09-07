-- Per-seller shipping fees.
--
-- marketplace_orders.shipping_fee is a single order-level column, so on an order
-- containing items from two sellers the second seller to set a fee silently
-- overwrote the first one's. Each seller now owns a row keyed by their store name.
--
-- marketplace_orders.shipping_fee is kept as the cached SUM of these rows, so the
-- buyer-facing total stays a single number and existing reads keep working.

CREATE TABLE IF NOT EXISTS marketplace_order_shipping (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0 CHECK (fee >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, supplier_name)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_order_shipping_order
  ON marketplace_order_shipping(order_id);

-- Backfill existing fees. Only single-seller orders can be attributed safely; on a
-- multi-seller order there is no way to know which seller charged the fee, so those
-- are left for the seller to re-issue.
INSERT INTO marketplace_order_shipping (order_id, supplier_name, fee)
SELECT o.id, sole.supplier_name, o.shipping_fee
FROM marketplace_orders o
JOIN LATERAL (
  SELECT MIN(i.supplier_name) AS supplier_name
  FROM marketplace_order_items i
  WHERE i.order_id = o.id
  HAVING COUNT(DISTINCT i.supplier_name) = 1
) sole ON sole.supplier_name IS NOT NULL
WHERE COALESCE(o.shipping_fee, 0) > 0
ON CONFLICT (order_id, supplier_name) DO NOTHING;
