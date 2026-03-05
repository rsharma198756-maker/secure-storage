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

-- Admin role gets full security control permission (no separate super_admin role needed)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'security:control'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
