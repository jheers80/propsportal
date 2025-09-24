-- =====================================================
-- Enable RLS for user_roles, permissions, and role_permissions tables
-- =====================================================
-- This SQL enables Row Level Security on the user_roles, permissions,
-- and role_permissions tables and creates policies to work with
-- the existing application
-- =====================================================

-- =====================================================
-- ENABLE RLS ON TABLES
-- =====================================================

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on role_permissions table
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES FOR user_roles
-- =====================================================

-- Policy: Allow all authenticated users to SELECT user_roles
-- This is needed for displaying role names in the UI
CREATE POLICY "Allow authenticated users to read user_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow superadmin users to INSERT user_roles
CREATE POLICY "Allow superadmin to insert user_roles"
ON user_roles
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

-- Policy: Allow superadmin users to UPDATE user_roles
CREATE POLICY "Allow superadmin to update user_roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- Policy: Allow superadmin users to DELETE user_roles
-- Note: Be careful with this - deleting roles that are in use may cause issues
CREATE POLICY "Allow superadmin to delete user_roles"
ON user_roles
FOR DELETE
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
-- POLICIES FOR permissions
-- =====================================================

-- Policy: Allow all authenticated users to SELECT permissions
-- This is needed for displaying permission names and checking user permissions
CREATE POLICY "Allow authenticated users to read permissions"
ON permissions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow superadmin users to INSERT permissions
CREATE POLICY "Allow superadmin to insert permissions"
ON permissions
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

-- Policy: Allow superadmin users to UPDATE permissions
CREATE POLICY "Allow superadmin to update permissions"
ON permissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- Policy: Allow superadmin users to DELETE permissions
CREATE POLICY "Allow superadmin to delete permissions"
ON permissions
FOR DELETE
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
-- POLICIES FOR role_permissions
-- =====================================================

-- Policy: Allow all authenticated users to SELECT role_permissions
-- This is needed for checking user permissions
CREATE POLICY "Allow authenticated users to read role_permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow superadmin users to INSERT role_permissions
CREATE POLICY "Allow superadmin to insert role_permissions"
ON role_permissions
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

-- Policy: Allow superadmin users to UPDATE role_permissions
CREATE POLICY "Allow superadmin to update role_permissions"
ON role_permissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON p.role = ur.id
    WHERE p.id = auth.uid()
    AND ur.name = 'superadmin'
  )
);

-- Policy: Allow superadmin users to DELETE role_permissions
CREATE POLICY "Allow superadmin to delete role_permissions"
ON role_permissions
FOR DELETE
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
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_roles', 'permissions', 'role_permissions')
ORDER BY tablename;

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('user_roles', 'permissions', 'role_permissions')
ORDER BY tablename, policyname;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. The current application uses service role key in API routes,
--    which bypasses RLS. This is fine for admin operations.
-- 2. If you want stricter security, you could modify the API routes
--    to use the authenticated user's session instead of service role.
-- 3. The policies above ensure that only superadmin users can modify
--    user_roles, permissions, and role_permissions, while all
--    authenticated users can read them.
-- 4. Make sure the superadmin role exists and is properly assigned
--    before enabling these policies.
-- 5. Test thoroughly after applying these policies, especially
--    permission checking functionality.</content>
<parameter name="filePath">d:\programming\pr-ops-portal\enable_rls_user_roles.sql
