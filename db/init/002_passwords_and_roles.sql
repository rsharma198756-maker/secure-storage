-- Migration: Add passwords, new roles (editor, viewer), audit:read permission, seed admin user

-- 1. Add password_hash to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- 2. Add audit:read permission
INSERT INTO permissions (key, description)
VALUES ('audit:read', 'View audit logs')
ON CONFLICT DO NOTHING;

-- 3. Add editor role (keep the old 'user' role but add editor & viewer)
INSERT INTO roles (name, description)
VALUES
  ('editor', 'Can read, create, update, and share files'),
  ('viewer', 'Read-only access to files')
ON CONFLICT DO NOTHING;

-- 4. Give admin the audit:read permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.key = 'audit:read'
ON CONFLICT DO NOTHING;

-- 5. Assign editor permissions: items:read, items:write, items:delete, items:share
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN ('items:read', 'items:write', 'items:delete', 'items:share')
WHERE r.name = 'editor'
ON CONFLICT DO NOTHING;

-- 6. Assign viewer permissions: items:read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'items:read'
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- 7. Seed default admin user (password: Admin@123, bcrypt hash)
-- Hash generated with bcrypt cost 12: $2b$12$LJ3m4ys2Ke0WfBOyVPNR2eWSblp0lKRSBBnTLwXvGxh9KkVxzSmKq
INSERT INTO users (email, password_hash, status, email_verified_at)
VALUES (
  'admin@magnus.local',
  '$2b$12$WfgZM2tF8tmbwQ18cUDIoeKgFic26wckpBo5hXVH4pUB.jEMXfRPa',
  'active',
  now()
)
ON CONFLICT (email) DO NOTHING;

-- 8. Assign admin role to the seeded admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@magnus.local' AND r.name = 'admin'
ON CONFLICT DO NOTHING;
