const { createClient } = require('@supabase/supabase-js');
const logger = require('./scripts/cliLogger');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateLocationsTable() {
  logger.info('Starting locations table migration...');

  try {
    // Check if columns already exist
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'locations')
      .in('column_name', ['store_id', 'store_name', 'city', 'state', 'zip']);

    if (columnError) {
      logger.error('Error checking columns:', columnError);
      return;
    }

    const existingColumns = columns.map(col => col.column_name);
  logger.info('Existing columns:', existingColumns);

    // Add missing columns
    const missingColumns = ['store_id', 'store_name', 'city', 'state', 'zip'].filter(
      col => !existingColumns.includes(col)
    );

    if (missingColumns.length === 0) {
      logger.info('All required columns already exist!');
      return;
    }

    logger.info('Adding missing columns:', missingColumns);

    // Since we can't use ALTER TABLE directly with Supabase client,
    // we'll provide the SQL commands to run manually
    logger.info('\nPlease run the following SQL commands in your Supabase SQL Editor:');
    logger.info('='.repeat(60));

    missingColumns.forEach(column => {
      logger.info(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS ${column} TEXT;`);
    });

    logger.info('\n-- Add unique constraint to store_id');
    logger.info('ALTER TABLE locations ADD CONSTRAINT locations_store_id_unique UNIQUE (store_id);');

    logger.info('\n-- Update existing records to populate store_name from name');
    logger.info('UPDATE locations SET store_name = name WHERE store_name IS NULL AND name IS NOT NULL;');

    logger.info('\n-- Make store_name NOT NULL');
    logger.info('ALTER TABLE locations ALTER COLUMN store_name SET NOT NULL;');

    logger.info('='.repeat(60));
    logger.info('Migration script generated successfully!');

  } catch (error) {
    logger.error('Migration failed:', error);
  }
}

migrateLocationsTable();
