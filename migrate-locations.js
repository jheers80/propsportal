const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateLocationsTable() {
  console.log('Starting locations table migration...');

  try {
    // Check if columns already exist
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'locations')
      .in('column_name', ['store_id', 'store_name', 'city', 'state', 'zip']);

    if (columnError) {
      console.error('Error checking columns:', columnError);
      return;
    }

    const existingColumns = columns.map(col => col.column_name);
    console.log('Existing columns:', existingColumns);

    // Add missing columns
    const missingColumns = ['store_id', 'store_name', 'city', 'state', 'zip'].filter(
      col => !existingColumns.includes(col)
    );

    if (missingColumns.length === 0) {
      console.log('All required columns already exist!');
      return;
    }

    console.log('Adding missing columns:', missingColumns);

    // Since we can't use ALTER TABLE directly with Supabase client,
    // we'll provide the SQL commands to run manually
    console.log('\nPlease run the following SQL commands in your Supabase SQL Editor:');
    console.log('='.repeat(60));

    missingColumns.forEach(column => {
      console.log(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS ${column} TEXT;`);
    });

    console.log('\n-- Add unique constraint to store_id');
    console.log('ALTER TABLE locations ADD CONSTRAINT locations_store_id_unique UNIQUE (store_id);');

    console.log('\n-- Update existing records to populate store_name from name');
    console.log('UPDATE locations SET store_name = name WHERE store_name IS NULL AND name IS NOT NULL;');

    console.log('\n-- Make store_name NOT NULL');
    console.log('ALTER TABLE locations ALTER COLUMN store_name SET NOT NULL;');

    console.log('='.repeat(60));
    console.log('Migration script generated successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateLocationsTable();
