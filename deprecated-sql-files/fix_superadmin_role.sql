-- =====================================================
-- Fix Superadmin User Role
-- =====================================================
-- Run this in Supabase SQL Editor to fix the superadmin user's role
-- =====================================================

-- First, check what roles exist and their IDs
SELECT id, name, display_name FROM user_roles ORDER BY id;

-- Find the superadmin user (replace 'superadmin@example.com' with actual email)
SELECT p.id, p.email, p.role, ur.name as role_name
FROM profiles p
LEFT JOIN user_roles ur ON p.role = ur.id
WHERE p.email = 'superadmin@example.com';  -- Replace with actual superadmin email

-- Update the superadmin user to have the correct role (assuming superadmin has ID 1)
UPDATE profiles
SET role = 1  -- superadmin role ID
WHERE email = 'superadmin@example.com';  -- Replace with actual superadmin email

-- Verify the update
SELECT p.id, p.email, p.role, ur.name as role_name
FROM profiles p
LEFT JOIN user_roles ur ON p.role = ur.id
WHERE p.email = 'superadmin@example.com';

-- Alternative: If you don't know the email, you can update by user ID
-- UPDATE profiles SET role = 1 WHERE id = 'user-uuid-here';
