-- =====================================================
-- Fix Missing Roles-Permissions Permissions
-- =====================================================
-- Add missing permissions for the roles-permissions page
-- =====================================================

-- Insert missing permissions for roles-permissions functionality
INSERT INTO permissions (name, description) VALUES
  ('roles-permissions.view', 'View roles and permissions management'),
  ('roles-permissions.create', 'Create new roles and permissions'),
  ('roles-permissions.edit', 'Edit roles and permissions'),
  ('roles-permissions.delete', 'Delete roles and permissions')
ON CONFLICT (name) DO NOTHING;

-- Assign these permissions to superadmin role
INSERT INTO role_permissions (role, permission_id)
SELECT ur.id, p.id
FROM user_roles ur
CROSS JOIN permissions p
WHERE ur.name = 'superadmin'
  AND p.name IN ('roles-permissions.view', 'roles-permissions.create', 'roles-permissions.edit', 'roles-permissions.delete')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Verify the permissions were added
SELECT ur.name as role_name, p.name as permission_name
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.name = 'superadmin'
  AND p.name LIKE 'roles-permissions.%'
ORDER BY p.name;
