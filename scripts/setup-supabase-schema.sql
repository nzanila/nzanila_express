-- Create marketplace_suppliers table
CREATE TABLE IF NOT EXISTS marketplace_suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  rating REAL NOT NULL DEFAULT 4.8,
  response_rate INTEGER NOT NULL DEFAULT 95,
  years_active INTEGER NOT NULL DEFAULT 5,
  verified BOOLEAN NOT NULL DEFAULT false,
  product_count INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  specialty TEXT NOT NULL
);

-- Create marketplace_products table
CREATE TABLE IF NOT EXISTS marketplace_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  compare_at_price NUMERIC,
  moq INTEGER NOT NULL DEFAULT 1,
  rating REAL NOT NULL DEFAULT 4.7,
  reviews INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  supplier_id INTEGER NOT NULL,
  supplier_name TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  unit TEXT NOT NULL DEFAULT 'piece',
  description TEXT NOT NULL,
  shipping TEXT NOT NULL DEFAULT 'Ships in 5–8 days',
  featured BOOLEAN NOT NULL DEFAULT false
);

-- Create marketplace_cart_items table
CREATE TABLE IF NOT EXISTS marketplace_cart_items (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Create marketplace_orders table
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'processing',
  total NUMERIC NOT NULL,
  item_count INTEGER NOT NULL,
  buyer_name TEXT NOT NULL DEFAULT 'Demo buyer',
  destination TEXT NOT NULL
);

-- Create marketplace_order_items table
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  supplier_name TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON marketplace_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON marketplace_products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON marketplace_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON marketplace_order_items(order_id);