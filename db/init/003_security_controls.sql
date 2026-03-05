-- Migration: Security controls for forced logout and emergency tap-off

-- Users: profile columns expected by gateway + forced-logout cutoff
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_logout_after timestamptz;

-- Refresh token revocation metadata
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_reason text;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- OTP purpose support (login vs security-stepup)
ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'login';

-- Singleton security controls row
CREATE TABLE IF NOT EXISTS security_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  global_logout_after timestamptz,
  tap_off_active boolean NOT NULL DEFAULT false,
  tap_off_started_at timestamptz,
  tap_off_ended_at timestamptz,
  tap_off_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tap_off_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO security_controls (id, tap_off_active)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

-- Security control privilege
INSERT INTO permissions (key, description)
VALUES ('security:control', 'Perform emergency security controls and global session actions')
ON CONFLICT DO NOTHING;

-- Super-admin role dedicated for security control actions
INSERT INTO roles (name, description)
VALUES ('super_admin', 'Can execute emergency security controls')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'security:control'
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Seeded admin gets super_admin to keep bootstrap account operational
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'super_admin'
WHERE u.email = 'solutionnyx@gmail.com'
ON CONFLICT DO NOTHING;
