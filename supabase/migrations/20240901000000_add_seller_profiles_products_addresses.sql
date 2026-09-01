-- Add Burundi location reference tables
CREATE TABLE IF NOT EXISTS burundi_provinces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_rn TEXT NOT NULL,
  name_sw TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS burundi_communes (
  id SERIAL PRIMARY KEY,
  province_id INTEGER NOT NULL REFERENCES burundi_provinces(id),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_rn TEXT NOT NULL,
  name_sw TEXT NOT NULL,
  UNIQUE(province_id, name)
);

CREATE TABLE IF NOT EXISTS burundi_zones (
  id SERIAL PRIMARY KEY,
  commune_id INTEGER NOT NULL REFERENCES burundi_communes(id),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_rn TEXT NOT NULL,
  name_sw TEXT NOT NULL,
  UNIQUE(commune_id, name)
);

-- Add seller profile enhancements to marketplace_users
ALTER TABLE marketplace_users 
  ADD COLUMN IF NOT EXISTS profile_picture TEXT,
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS delivery_fee_structure JSONB,
  ADD COLUMN IF NOT EXISTS shop_latitude REAL,
  ADD COLUMN IF NOT EXISTS shop_longitude REAL,
  ADD COLUMN IF NOT EXISTS shop_location_approximate BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS rating REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Create seller shop pictures table
CREATE TABLE IF NOT EXISTS seller_shop_pictures (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  picture_url TEXT NOT NULL,
  picture_type TEXT NOT NULL CHECK (picture_type IN ('shop', 'warehouse', 'business_location', 'logo')),
  is_primary BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create buyer addresses table
CREATE TABLE IF NOT EXISTS buyer_addresses (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  address_name TEXT NOT NULL, -- 'Home', 'Work', 'Other'
  recipient_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  province_id INTEGER REFERENCES burundi_provinces(id),
  province TEXT,
  commune_id INTEGER REFERENCES burundi_communes(id),
  commune TEXT,
  zone_id INTEGER REFERENCES burundi_zones(id),
  zone TEXT,
  landmark TEXT,
  detailed_directions TEXT,
  latitude REAL,
  longitude REAL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create seller product listings table (enhanced from existing products)
CREATE TABLE IF NOT EXISTS seller_products (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  minimum_order_quantity INTEGER NOT NULL DEFAULT 1,
  available_stock INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'used')),
  delivery_available BOOLEAN DEFAULT true,
  pickup_available BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create product pictures table
CREATE TABLE IF NOT EXISTS product_pictures (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  picture_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create seller delivery zones table
CREATE TABLE IF NOT EXISTS seller_delivery_zones (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  province_id INTEGER REFERENCES burundi_provinces(id),
  commune_id INTEGER REFERENCES burundi_communes(id),
  zone_id INTEGER REFERENCES burundi_zones(id),
  delivery_fee NUMERIC,
  estimated_delivery_days INTEGER,
  is_available BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_shop_pictures_seller ON seller_shop_pictures(seller_id);
CREATE INDEX IF NOT EXISTS idx_buyer_addresses_buyer ON buyer_addresses(buyer_id);
CREATE INDEX IF NOT EXISTS idx_seller_products_seller ON seller_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_products_category ON seller_products(category);
CREATE INDEX IF NOT EXISTS idx_seller_products_active ON seller_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_pictures_product ON product_pictures(product_id);
CREATE INDEX IF NOT EXISTS idx_seller_delivery_zones_seller ON seller_delivery_zones(seller_id);

-- Add indexes for location queries
CREATE INDEX IF NOT EXISTS idx_buyer_addresses_province ON buyer_addresses(province_id);
CREATE INDEX IF NOT EXISTS idx_buyer_addresses_commune ON buyer_addresses(commune_id);
CREATE INDEX IF NOT EXISTS idx_seller_delivery_zones_province ON seller_delivery_zones(province_id);
CREATE INDEX IF NOT EXISTS idx_seller_delivery_zones_commune ON seller_delivery_zones(commune_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketplace_users_updated_at BEFORE UPDATE ON marketplace_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyer_addresses_updated_at BEFORE UPDATE ON buyer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_products_updated_at BEFORE UPDATE ON seller_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
