import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKeyEnv = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKeyEnv) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY. Export them before running this script; never hardcode them.');
  process.exit(1);
}
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const migrationFile = path.join(__dirname, '../supabase/migrations/20240830000003_add_onboarding_fields.sql');
  
  console.log('Running onboarding fields migration...');
  
  try {
    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log('SQL to execute:', sql);
    
    // Split SQL by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 100) + '...');
        
        // Use the SQL editor API via RPC
        const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() });
        
        if (error) {
          // If the column already exists, that's okay
          if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
            console.log('  ✓ Column/field already exists (skipping)');
          } else {
            console.error('  ✗ Error:', error.message);
          }
        } else {
          console.log('  ✓ Executed successfully');
        }
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runMigration();
