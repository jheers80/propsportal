-- =====================================================
-- Prep Planner Database Cleanup
-- =====================================================
-- This file removes all prep-planner related tables and data
-- Run this in your Supabase SQL Editor to clean up prep-planner system
-- =====================================================

-- Drop tables in reverse dependency order to avoid foreign key constraint issues

-- 1. Drop prep schedules table (has foreign keys to prep_items and locations)
DROP TABLE IF EXISTS prep_schedules CASCADE;

-- 2. Drop prep items table (has foreign key to locations)  
DROP TABLE IF EXISTS prep_items CASCADE;

-- 3. Drop prep task lists table (if it exists - has foreign key to locations)
DROP TABLE IF EXISTS prep_task_lists CASCADE;

-- 4. Drop prep planner settings table (has foreign key to locations)
DROP TABLE IF EXISTS prep_planner_settings CASCADE;

-- 5. Drop prep calculation rules table (if it exists)
DROP TABLE IF EXISTS prep_calculation_rules CASCADE;

-- 6. Drop prep forecast inputs table (if it exists)
DROP TABLE IF EXISTS prep_forecast_inputs CASCADE;

-- 7. Drop any prep-related indexes (if they were created separately)
DROP INDEX IF EXISTS idx_prep_schedules_location_date;
DROP INDEX IF EXISTS idx_prep_schedules_assigned_to;
DROP INDEX IF EXISTS idx_prep_items_location_category;
DROP INDEX IF EXISTS idx_prep_planner_settings_location;
DROP INDEX IF EXISTS idx_prep_task_lists_location;
DROP INDEX IF EXISTS idx_prep_calculation_rules_location;
DROP INDEX IF EXISTS idx_prep_forecast_inputs_location;

-- 8. Remove any prep-planner related functions
DROP FUNCTION IF EXISTS get_prep_schedule_for_location(bigint, date);
DROP FUNCTION IF EXISTS create_prep_schedule_for_location(bigint, date);
DROP FUNCTION IF EXISTS update_prep_item_completion(bigint, boolean);
DROP FUNCTION IF EXISTS calculate_prep_forecast(bigint, date);
DROP FUNCTION IF EXISTS get_prep_calculation_rules(bigint);

-- 9. Remove any prep-planner related triggers
DROP TRIGGER IF EXISTS update_prep_planner_settings_updated_at ON prep_planner_settings;
DROP TRIGGER IF EXISTS update_prep_items_updated_at ON prep_items;
DROP TRIGGER IF EXISTS update_prep_schedules_updated_at ON prep_schedules;
DROP TRIGGER IF EXISTS update_prep_calculation_rules_updated_at ON prep_calculation_rules;
DROP TRIGGER IF EXISTS update_prep_forecast_inputs_updated_at ON prep_forecast_inputs;

-- 10. Clean up any prep-planner features from the features table
DELETE FROM features WHERE name LIKE '%prep%' OR name LIKE '%task%';

-- 11. Clean up any prep-planner permissions from permissions table  
DELETE FROM permissions WHERE name LIKE '%prep%' OR name LIKE '%task%';

-- 12. Clean up any role_permissions entries for deleted permissions
DELETE FROM role_permissions 
WHERE permission_id NOT IN (SELECT id FROM permissions);

-- 13. Remove any audit trail entries related to prep-planner
DELETE FROM audit_trails 
WHERE table_name IN ('prep_schedules', 'prep_items', 'prep_task_lists', 'prep_planner_settings', 'prep_calculation_rules', 'prep_forecast_inputs')
OR action_details LIKE '%prep%';

-- Verification queries to check cleanup (uncomment to run)
-- SELECT COUNT(*) as remaining_prep_schedules FROM information_schema.tables WHERE table_name = 'prep_schedules';
-- SELECT COUNT(*) as remaining_prep_items FROM information_schema.tables WHERE table_name = 'prep_items';  
-- SELECT COUNT(*) as remaining_prep_settings FROM information_schema.tables WHERE table_name = 'prep_planner_settings';
-- SELECT COUNT(*) as remaining_prep_calculation_rules FROM information_schema.tables WHERE table_name = 'prep_calculation_rules';
-- SELECT COUNT(*) as remaining_prep_forecast_inputs FROM information_schema.tables WHERE table_name = 'prep_forecast_inputs';
-- SELECT name FROM features WHERE name LIKE '%prep%' OR name LIKE '%task%';
-- SELECT name FROM permissions WHERE name LIKE '%prep%' OR name LIKE '%task%';

-- =====================================================
-- Cleanup Complete
-- =====================================================
-- All prep-planner tables, indexes, functions, triggers, 
-- and related data have been removed from the database.
-- =====================================================