-- =====================================================
-- Disable RLS for user_roles, permissions, and role_permissions tables
-- =====================================================
-- Use this SQL to disable RLS if you need to rollback
-- or for testing purposes
-- =====================================================

-- Drop all policies first
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow superadmin to insert user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow superadmin to update user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow superadmin to delete user_roles" ON user_roles;

DROP POLICY IF EXISTS "Allow authenticated users to read permissions" ON permissions;
DROP POLICY IF EXISTS "Allow superadmin to insert permissions" ON permissions;
DROP POLICY IF EXISTS "Allow superadmin to update permissions" ON permissions;
DROP POLICY IF EXISTS "Allow superadmin to delete permissions" ON permissions;

DROP POLICY IF EXISTS "Allow authenticated users to read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow superadmin to insert role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow superadmin to update role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow superadmin to delete role_permissions" ON role_permissions;

-- Disable RLS on tables
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if RLS is disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_roles', 'permissions', 'role_permissions')
ORDER BY tablename;

-- Check that no policies remain
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('user_roles', 'permissions', 'role_permissions');
