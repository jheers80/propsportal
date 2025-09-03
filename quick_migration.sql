-- =====================================================
-- Quick Migration Script for Locations Table
-- =====================================================
-- If you prefer to run individual commands, use these in order:
-- =====================================================

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'locations'
ORDER BY ordinal_position;

-- Step 2: If 'name' column exists, migrate data and drop it
ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_name TEXT;
UPDATE locations SET store_name = name WHERE store_name IS NULL AND name IS NOT NULL;
ALTER TABLE locations DROP COLUMN IF EXISTS name;

-- Step 3: Add missing columns
ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS zip TEXT;

-- Step 4: Set constraints (only run these if columns exist and are nullable)
ALTER TABLE locations ALTER COLUMN store_name SET NOT NULL;
ALTER TABLE locations ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE locations ADD CONSTRAINT locations_store_id_unique UNIQUE (store_id);

-- Step 5: Populate missing store_ids for existing records
UPDATE locations SET store_id = 'STORE_' || id WHERE store_id IS NULL;
