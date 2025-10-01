-- =====================================================
-- Prep Planner Cleanup Verification Script
-- =====================================================
-- Run this after cleanup to verify all prep-related items are removed
-- =====================================================

-- Check for any remaining prep tables
SELECT 
    'PREP TABLES CHECK' as verification_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO PREP TABLES FOUND' 
        ELSE '❌ PREP TABLES STILL EXIST' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%prep%';

-- List any remaining prep tables if they exist
SELECT 
    'REMAINING PREP TABLES' as type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%prep%';

-- Check for prep-related functions
SELECT 
    'PREP FUNCTIONS CHECK' as verification_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO PREP FUNCTIONS FOUND' 
        ELSE '❌ PREP FUNCTIONS STILL EXIST' 
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%prep%';

-- List any remaining prep functions if they exist
SELECT 
    'REMAINING PREP FUNCTIONS' as type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%prep%';

-- Check for prep-related features
SELECT 
    'PREP FEATURES CHECK' as verification_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO PREP FEATURES FOUND' 
        ELSE '❌ PREP FEATURES STILL EXIST' 
    END as status
FROM features 
WHERE name LIKE '%prep%' 
   OR name LIKE '%task%' 
   OR display_name LIKE '%prep%' 
   OR display_name LIKE '%task%';

-- List any remaining prep features if they exist
SELECT 
    'REMAINING PREP FEATURES' as type,
    name,
    display_name,
    link
FROM features 
WHERE name LIKE '%prep%' 
   OR name LIKE '%task%' 
   OR display_name LIKE '%prep%' 
   OR display_name LIKE '%task%';

-- Check for prep-related permissions
SELECT 
    'PREP PERMISSIONS CHECK' as verification_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO PREP PERMISSIONS FOUND' 
        ELSE '❌ PREP PERMISSIONS STILL EXIST' 
    END as status
FROM permissions 
WHERE name LIKE '%prep%' 
   OR name LIKE '%task%' 
   OR description LIKE '%prep%' 
   OR description LIKE '%task%';

-- List any remaining prep permissions if they exist
SELECT 
    'REMAINING PREP PERMISSIONS' as type,
    name,
    description
FROM permissions 
WHERE name LIKE '%prep%' 
   OR name LIKE '%task%' 
   OR description LIKE '%prep%' 
   OR description LIKE '%task%';

-- Check for orphaned role_permissions
SELECT 
    'ORPHANED ROLE_PERMISSIONS CHECK' as verification_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ORPHANED ROLE_PERMISSIONS' 
        ELSE '❌ ORPHANED ROLE_PERMISSIONS EXIST' 
    END as status
FROM role_permissions rp
WHERE rp.permission_id NOT IN (SELECT id FROM permissions);

-- Check for prep-related audit trails
SELECT 
    'PREP AUDIT TRAILS CHECK' as verification_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO PREP AUDIT TRAILS FOUND' 
        ELSE '❌ PREP AUDIT TRAILS STILL EXIST' 
    END as status
FROM audit_trails 
WHERE table_name LIKE '%prep%' 
   OR action_details LIKE '%prep%' 
   OR old_values LIKE '%prep%' 
   OR new_values LIKE '%prep%';

-- Final summary
SELECT 
    '🎉 CLEANUP VERIFICATION COMPLETE' as final_status,
    'All checks completed. Review results above for any remaining prep-planner items.' as message;

-- =====================================================
-- Verification Complete
-- =====================================================