-- =====================================================
-- Migration: Add missing fields to locations table
-- =====================================================
-- This migration adds the missing fields to the locations table
-- to match the API expectations
-- =====================================================

-- Add missing columns to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_id TEXT UNIQUE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS zip TEXT;

-- Update existing records to populate store_name from name (if exists)
UPDATE locations SET store_name = name WHERE store_name IS NULL AND name IS NOT NULL;

-- Make store_name NOT NULL after populating existing data
ALTER TABLE locations ALTER COLUMN store_name SET NOT NULL;

-- Make store_id NOT NULL (this will require manual data entry for existing records)
-- For now, we'll allow NULL and let the application handle it
-- ALTER TABLE locations ALTER COLUMN store_id SET NOT NULL;
