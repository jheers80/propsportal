-- =====================================================
-- Database Verification Script
-- =====================================================
-- Run this in Supabase SQL Editor to verify that the database setup is complete
-- and all previous errors are fixed
-- =====================================================

-- =====================================================
-- 1. CHECK IF ALL REQUIRED TABLES EXIST
-- =====================================================

SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles',
    'permissions',
    'role_permissions',
    'profiles',
    'locations',
    'user_locations',
    'passphrases',
    'features',
    'quick_access_sessions',
    'audit_trails'
  )
ORDER BY tablename;

-- =====================================================
-- 2. CHECK INITIAL DATA INSERTION
-- =====================================================

-- Check user roles
SELECT id, name, display_name FROM user_roles ORDER BY id;

-- Check permissions
SELECT id, name, description FROM permissions ORDER BY name;

-- Check features
SELECT id, name, display_name, roles FROM features ORDER BY name;

-- Check role permissions assignment
SELECT
  ur.name as role_name,
  p.name as permission_name
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role
JOIN permissions p ON rp.permission_id = p.id
ORDER BY ur.name, p.name;

-- =====================================================
-- 3. CHECK FUNCTIONS
-- =====================================================

-- Test get_my_role function (this will return 'staff' if no user is authenticated)
SELECT get_my_role();

-- Check if handle_new_user trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- 4. CHECK RLS POLICIES
-- =====================================================

-- Check RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles',
    'permissions',
    'role_permissions',
    'profiles',
    'locations',
    'user_locations',
    'passphrases',
    'features',
    'audit_trails',
    'quick_access_sessions'
  )
ORDER BY tablename;

-- Check policies on user_roles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Check policies on profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- 5. CHECK INDEXES
-- =====================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'role_permissions',
    'user_locations',
    'passphrases',
    'quick_access_sessions',
    'audit_trails'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- 6. CHECK EXISTING USERS AND PROFILES
-- =====================================================

-- Check auth.users (this will show user IDs and emails)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Check profiles table
SELECT
  p.id,
  p.email,
  p.full_name,
  ur.name as role_name,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.role = ur.id
ORDER BY p.created_at DESC;

-- =====================================================
-- 7. TEST BASIC QUERIES (these should work without errors)
-- =====================================================

-- Test user_roles query (this was failing before)
SELECT * FROM user_roles ORDER BY id;

-- Test permissions query
SELECT * FROM permissions ORDER BY name;

-- Test features query
SELECT * FROM features ORDER BY name;

-- Test role_permissions query
SELECT * FROM role_permissions LIMIT 10;

-- =====================================================
-- VERIFICATION COMPLETE
-- =====================================================

-- If all queries above run without errors and return expected data,
-- then the database setup is complete and the "relation does not exist" error is fixed.
