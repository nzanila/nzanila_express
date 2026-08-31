const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pvjztlwjuccmiggorwps.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2anp0bHdqdWNjbWlnZ29yd3BzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExODExMiwiZXhwIjoyMTAzNjk0MTEyfQ.4kKrn9URu0RPisHw5yi7oK8vCJuhQAKqXEjAZPkPw6A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSchema() {
  console.log('Setting up Supabase schema...');

  try {
    // Create marketplace_suppliers table
    const { error: suppliersError } = await supabase
      .from('marketplace_suppliers')
      .select('*')
      .limit(1);

    if (suppliersError && suppliersError.code === '42P01') {
      // Table doesn't exist, we need to create it via SQL
      console.log('Creating marketplace_suppliers table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE marketplace_suppliers (
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
        `
      });
      
      if (createError) {
        console.error('Error creating suppliers table:', createError);
      } else {
        console.log('✓ marketplace_suppliers table created');
      }
    } else {
      console.log('✓ marketplace_suppliers table already exists');
    }

    // Create marketplace_products table
    const { error: productsError } = await supabase
      .from('marketplace_products')
      .select('*')
      .limit(1);

    if (productsError && productsError.code === '42P01') {
      console.log('Creating marketplace_products table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE marketplace_products (
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
        `
      });
      
      if (createError) {
        console.error('Error creating products table:', createError);
      } else {
        console.log('✓ marketplace_products table created');
      }
    } else {
      console.log('✓ marketplace_products table already exists');
    }

    // Create marketplace_cart_items table
    const { error: cartError } = await supabase
      .from('marketplace_cart_items')
      .select('*')
      .limit(1);

    if (cartError && cartError.code === '42P01') {
      console.log('Creating marketplace_cart_items table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE marketplace_cart_items (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1
          );
        `
      });
      
      if (createError) {
        console.error('Error creating cart items table:', createError);
      } else {
        console.log('✓ marketplace_cart_items table created');
      }
    } else {
      console.log('✓ marketplace_cart_items table already exists');
    }

    // Create marketplace_orders table
    const { error: ordersError } = await supabase
      .from('marketplace_orders')
      .select('*')
      .limit(1);

    if (ordersError && ordersError.code === '42P01') {
      console.log('Creating marketplace_orders table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE marketplace_orders (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'processing',
            total NUMERIC NOT NULL,
            item_count INTEGER NOT NULL,
            buyer_name TEXT NOT NULL DEFAULT 'Demo buyer',
            destination TEXT NOT NULL
          );
        `
      });
      
      if (createError) {
        console.error('Error creating orders table:', createError);
      } else {
        console.log('✓ marketplace_orders table created');
      }
    } else {
      console.log('✓ marketplace_orders table already exists');
    }

    // Create marketplace_order_items table
    const { error: orderItemsError } = await supabase
      .from('marketplace_order_items')
      .select('*')
      .limit(1);

    if (orderItemsError && orderItemsError.code === '42P01') {
      console.log('Creating marketplace_order_items table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE marketplace_order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC NOT NULL,
            supplier_name TEXT NOT NULL
          );
        `
      });
      
      if (createError) {
        console.error('Error creating order items table:', createError);
      } else {
        console.log('✓ marketplace_order_items table created');
      }
    } else {
      console.log('✓ marketplace_order_items table already exists');
    }

    console.log('Schema setup completed!');
  } catch (error) {
    console.error('Error setting up schema:', error);
  }
}

setupSchema();