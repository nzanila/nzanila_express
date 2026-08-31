-- Create marketplace_users table
CREATE TABLE IF NOT EXISTS marketplace_users (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
  location TEXT NOT NULL DEFAULT 'Bujumbura',
  verified BOOLEAN NOT NULL DEFAULT false,
  avatar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON marketplace_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON marketplace_users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON marketplace_users(role);

-- Add user_id to cart_items (nullable for backward compat)
ALTER TABLE marketplace_cart_items ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES marketplace_users(id);

-- Add user_id to orders (nullable for backward compat)
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES marketplace_users(id);

-- Link existing orders to demo buyer if any
UPDATE marketplace_orders SET buyer_name = buyer_name WHERE buyer_name != 'Demo buyer';

-- Create index for user-linked queries
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON marketplace_cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user ON marketplace_orders(user_id) WHERE user_id IS NOT NULL;
