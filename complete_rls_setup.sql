-- =====================================================
-- Complete RLS Setup for PR Ops Portal
-- =====================================================
-- This SQL enables Row Level Security on all main tables
-- and creates policies to work with the existing application
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core role/permission tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- User data tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Feature access tables
ALTER TABLE passphrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_access_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES FOR CORE TABLES (user_roles, permissions, role_permissions)
-- =====================================================

-- These are the same policies as in enable_rls_user_roles.sql
-- (Copy the policies from that file here for completeness)

-- =====================================================
-- POLICIES FOR profiles
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Superadmin can read all profiles
CREATE POLICY "Superadmin can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- Superadmin can update all profiles (including role)
CREATE POLICY "Superadmin can update all profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- Superadmin can insert profiles
CREATE POLICY "Superadmin can insert profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- =====================================================
-- POLICIES FOR locations
-- =====================================================

-- All authenticated users can read locations
CREATE POLICY "Authenticated users can read locations"
ON locations
FOR SELECT
TO authenticated
USING (true);

-- Superadmin and multiunit managers can manage locations
CREATE POLICY "Superadmin and multiunit can manage locations"
ON locations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name IN ('superadmin', 'multiunit')
  )
);

-- =====================================================
-- POLICIES FOR user_locations
-- =====================================================

-- Users can read their own location assignments
CREATE POLICY "Users can read own location assignments"
ON user_locations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Superadmin and multiunit can manage all user locations
CREATE POLICY "Superadmin and multiunit can manage user locations"
ON user_locations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name IN ('superadmin', 'multiunit')
  )
);

-- =====================================================
-- POLICIES FOR passphrases
-- =====================================================

-- Users can read passphrases for their assigned locations
CREATE POLICY "Users can read passphrases for assigned locations"
ON passphrases
FOR SELECT
TO authenticated
USING (
  location_id IN (
    SELECT location_id FROM user_locations WHERE user_id = auth.uid()
  )
);

-- Managers and above can manage passphrases for their locations
CREATE POLICY "Managers can manage passphrases for their locations"
ON passphrases
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    JOIN user_locations ul ON ul.user_id = p.id
    WHERE p.id = auth.uid()
    AND ur.name IN ('superadmin', 'multiunit', 'manager')
    AND ul.location_id = passphrases.location_id
  )
);

-- =====================================================
-- POLICIES FOR features
-- =====================================================

-- All authenticated users can read features
CREATE POLICY "Authenticated users can read features"
ON features
FOR SELECT
TO authenticated
USING (true);

-- Superadmin can manage features
CREATE POLICY "Superadmin can manage features"
ON features
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- =====================================================
-- POLICIES FOR quick_access_sessions
-- =====================================================

-- Users can read quick access sessions for their locations
CREATE POLICY "Users can read quick access sessions for their locations"
ON quick_access_sessions
FOR SELECT
TO authenticated
USING (
  location_id IN (
    SELECT location_id FROM user_locations WHERE user_id = auth.uid()
  )
);

-- Managers and above can manage quick access sessions
CREATE POLICY "Managers can manage quick access sessions"
ON quick_access_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name IN ('superadmin', 'multiunit', 'manager')
  )
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_roles', 'permissions', 'role_permissions', 'profiles', 'locations', 'user_locations', 'passphrases', 'features', 'quick_access_sessions')
ORDER BY tablename;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('user_roles', 'permissions', 'role_permissions', 'profiles', 'locations', 'user_locations', 'passphrases', 'features', 'quick_access_sessions')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 1. Test thoroughly after applying these policies
-- 2. The current application uses service role key for admin operations
-- 3. If you encounter issues, you can disable RLS using disable_rls_user_roles.sql
-- 4. Make sure superadmin role exists before applying
-- 5. Consider the business logic for each table's access patterns
