-- =====================================================
-- Add Unique Constraint to Passphrases Table
-- =====================================================
-- This migration adds a unique constraint on location_id for the passphrases table
-- to support the upsert operation in the API
-- =====================================================

-- Add unique constraint on location_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'passphrases' AND constraint_name = 'passphrases_location_id_unique'
    ) THEN
        -- First, handle any duplicate location_id entries by keeping only the most recent
        DELETE FROM passphrases
        WHERE id NOT IN (
            SELECT DISTINCT ON (location_id) id
            FROM passphrases
            ORDER BY location_id, created_at DESC
        );

        -- Add the unique constraint
        ALTER TABLE passphrases ADD CONSTRAINT passphrases_location_id_unique UNIQUE (location_id);
    END IF;
END $$;
