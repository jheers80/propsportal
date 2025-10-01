-- =====================================================
-- Comprehensive Prep Planner Database Cleanup
-- =====================================================
-- This script finds and removes ALL prep-related tables dynamically
-- Run this in your Supabase SQL Editor for complete cleanup
-- =====================================================

-- Create a temporary function to drop all prep-related tables
DO $$
DECLARE
    table_record RECORD;
    constraint_record RECORD;
    index_record RECORD;
    function_record RECORD;
    trigger_record RECORD;
BEGIN
    -- Raise notice for start of cleanup
    RAISE NOTICE 'Starting comprehensive prep-planner cleanup...';

    -- 1. Drop all foreign key constraints that reference prep tables first
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name LIKE '%prep%' OR tc.table_name LIKE '%prep%')
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: % from table %', constraint_record.constraint_name, constraint_record.table_name;
    END LOOP;

    -- 2. Drop all triggers related to prep tables
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table LIKE '%prep%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON ' || trigger_record.event_object_table || ' CASCADE';
        RAISE NOTICE 'Dropped trigger: % from table %', trigger_record.trigger_name, trigger_record.event_object_table;
    END LOOP;

    -- 3. Drop all indexes related to prep tables
    FOR index_record IN
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE (indexname LIKE '%prep%' OR tablename LIKE '%prep%')
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname || ' CASCADE';
        RAISE NOTICE 'Dropped index: % from table %', index_record.indexname, index_record.tablename;
    END LOOP;

    -- 4. Drop all tables with 'prep' in their name
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%prep%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || table_record.table_name || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', table_record.table_name;
    END LOOP;

    -- 5. Drop all functions related to prep
    FOR function_record IN
        SELECT routine_name, routine_schema
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name LIKE '%prep%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || function_record.routine_name || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', function_record.routine_name;
    END LOOP;

    RAISE NOTICE 'Comprehensive prep-planner table cleanup completed.';
END
$$;

-- 6. Clean up prep-related features from features table
DELETE FROM features WHERE name LIKE '%prep%' OR name LIKE '%task%' OR display_name LIKE '%prep%' OR display_name LIKE '%task%';

-- 7. Clean up prep-related permissions from permissions table
DELETE FROM permissions WHERE name LIKE '%prep%' OR name LIKE '%task%' OR description LIKE '%prep%' OR description LIKE '%task%';

-- 8. Clean up orphaned role_permissions entries
DELETE FROM role_permissions WHERE permission_id NOT IN (SELECT id FROM permissions);

-- 9. Clean up audit trail entries related to prep-planner
DELETE FROM audit_trails 
WHERE table_name LIKE '%prep%' 
   OR action_details LIKE '%prep%'
   OR old_values LIKE '%prep%'
   OR new_values LIKE '%prep%';

-- 10. Verification queries
SELECT 'REMAINING PREP TABLES:' as check_type;
SELECT table_name as remaining_prep_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%prep%';

SELECT 'REMAINING PREP FUNCTIONS:' as check_type;
SELECT routine_name as remaining_prep_functions
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%prep%';

SELECT 'REMAINING PREP FEATURES:' as check_type;
SELECT name, display_name as remaining_prep_features
FROM features
WHERE name LIKE '%prep%' OR name LIKE '%task%' OR display_name LIKE '%prep%' OR display_name LIKE '%task%';

SELECT 'REMAINING PREP PERMISSIONS:' as check_type;
SELECT name, description as remaining_prep_permissions
FROM permissions
WHERE name LIKE '%prep%' OR name LIKE '%task%' OR description LIKE '%prep%' OR description LIKE '%task%';

-- Success message
SELECT 'CLEANUP COMPLETED' as status, 
       'All prep-planner related tables, functions, features, and permissions have been removed' as message;

-- =====================================================
-- Comprehensive Cleanup Complete
-- =====================================================