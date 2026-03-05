-- Migration: Remove super_admin role and assign security:control directly to admin
-- This migration removes the separate super_admin role concept.
-- The admin role now directly holds the security:control permission.

-- 1. Remove all user_role entries for super_admin
DELETE FROM user_roles
WHERE role_id = (SELECT id FROM roles WHERE name = 'super_admin');

-- 2. Remove role_permissions for super_admin
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'super_admin');

-- 3. Delete the super_admin role itself
DELETE FROM roles WHERE name = 'super_admin';

-- 4. Give admin role the security:control permission (if not already set)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'security:control'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
