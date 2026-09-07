-- Buyer product reviews.
--
-- Until now the marketplace displayed a review count and could sort by it, but there was
-- no reviews table, no API to create one, and no UI to write one. `new_products.review_count`
-- was read in two places and written in none, so every product showed "0 reviews" forever.
--
-- Reviews are gated on a delivered order: a row may only be created by a buyer who actually
-- received that product. The API enforces it; the order_id column records which order
-- entitled the review so the claim stays auditable.
--
-- product_id holds the PUBLIC product id (1000000 + new_products.id) — the same identifier
-- the cart, orders and the marketplace UI use, so joins stay consistent.

CREATE TABLE IF NOT EXISTS product_reviews (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL,
  user_id     INTEGER NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  order_id    INTEGER,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per buyer per product; editing updates the existing row.
  CONSTRAINT product_reviews_one_per_buyer UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user    ON product_reviews(user_id);

COMMENT ON TABLE  product_reviews            IS 'Buyer reviews, restricted to verified purchases (delivered orders).';
COMMENT ON COLUMN product_reviews.product_id IS 'Public product id: 1000000 + new_products.id.';
COMMENT ON COLUMN product_reviews.order_id   IS 'The delivered order that entitled this review.';
