-- =====================================================
-- Location Table Migration Script - CORRECTED
-- =====================================================
-- Run this script in your Supabase SQL Editor to properly migrate the locations table
-- =====================================================

-- First, check if the old 'name' column exists and migrate data
DO $$
BEGIN
    -- Check if 'name' column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'name'
    ) THEN
        -- Migrate data from 'name' to 'store_name' if store_name is null
        UPDATE locations SET store_name = name WHERE store_name IS NULL AND name IS NOT NULL;

        -- Drop the old 'name' column
        ALTER TABLE locations DROP COLUMN name;
    END IF;
END $$;

-- Add missing columns (these will be no-ops if they already exist)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add unique constraint to store_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'locations' AND constraint_name = 'locations_store_id_unique'
    ) THEN
        ALTER TABLE locations ADD CONSTRAINT locations_store_id_unique UNIQUE (store_id);
    END IF;
END $$;

-- Make store_name NOT NULL (only if it doesn't already have this constraint)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'store_name' AND is_nullable = 'YES'
    ) THEN
        -- First ensure no null values exist
        UPDATE locations SET store_name = 'Unknown Store' WHERE store_name IS NULL;
        ALTER TABLE locations ALTER COLUMN store_name SET NOT NULL;
    END IF;
END $$;

-- Make store_id NOT NULL (only if it doesn't already have this constraint)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'store_id' AND is_nullable = 'YES'
    ) THEN
        -- First ensure no null values exist - generate store_ids for existing records
        UPDATE locations SET store_id = 'STORE_' || id WHERE store_id IS NULL;
        ALTER TABLE locations ALTER COLUMN store_id SET NOT NULL;
    END IF;
END $$;

-- Note: store_id should be manually populated for existing records
-- The application will require store_id for new locations
