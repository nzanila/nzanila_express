const postgres = require('postgres');

// Direct PostgreSQL connection to Supabase
const connectionString = 'postgres://postgres.pvjztlwjuccmiggorwps:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function setupSchema() {
  console.log('Setting up Supabase schema via direct connection...');
  
  const sql = postgres(connectionString);

  try {
    // Create marketplace_suppliers table
    await sql`
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
    `;
    console.log('✓ marketplace_suppliers table created');

    // Create marketplace_products table
    await sql`
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
    `;
    console.log('✓ marketplace_products table created');

    // Create marketplace_cart_items table
    await sql`
      CREATE TABLE IF NOT EXISTS marketplace_cart_items (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
      );
    `;
    console.log('✓ marketplace_cart_items table created');

    // Create marketplace_orders table
    await sql`
      CREATE TABLE IF NOT EXISTS marketplace_orders (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'processing',
        total NUMERIC NOT NULL,
        item_count INTEGER NOT NULL,
        buyer_name TEXT NOT NULL DEFAULT 'Demo buyer',
        destination TEXT NOT NULL
      );
    `;
    console.log('✓ marketplace_orders table created');

    // Create marketplace_order_items table
    await sql`
      CREATE TABLE IF NOT EXISTS marketplace_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC NOT NULL,
        supplier_name TEXT NOT NULL
      );
    `;
    console.log('✓ marketplace_order_items table created');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON marketplace_products(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_supplier ON marketplace_products(supplier_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_featured ON marketplace_products(featured) WHERE featured = true;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cart_items_product ON marketplace_cart_items(product_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON marketplace_order_items(order_id);`;
    console.log('✓ Indexes created');

    console.log('Schema setup completed successfully!');
  } catch (error) {
    console.error('Error setting up schema:', error);
  } finally {
    await sql.end();
  }
}

setupSchema();