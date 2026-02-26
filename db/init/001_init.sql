CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('folder', 'file')),
  name text NOT NULL,
  storage_key text UNIQUE,
  content_type text,
  size_bytes bigint,
  checksum_sha256 text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS items_unique_name_per_parent
  ON items(owner_user_id, parent_id, name)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS items_parent_idx ON items(parent_id);
CREATE INDEX IF NOT EXISTS items_owner_idx ON items(owner_user_id);

CREATE TABLE IF NOT EXISTS item_closure (
  ancestor_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  descendant_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  depth int NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX IF NOT EXISTS item_closure_desc_idx ON item_closure(descendant_id);

CREATE TABLE IF NOT EXISTS item_grants (
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'role')),
  subject_id uuid NOT NULL,
  permission text NOT NULL CHECK (permission IN ('read', 'write', 'delete', 'manage')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, subject_type, subject_id, permission)
);

CREATE INDEX IF NOT EXISTS item_grants_subject_idx ON item_grants(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS item_grants_item_idx ON item_grants(item_id);

CREATE TABLE IF NOT EXISTS otp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_tokens_email_idx ON otp_tokens(email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address inet
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs(target_type, target_id);

INSERT INTO roles (name, description)
VALUES
  ('admin', 'Full access'),
  ('user', 'Standard user')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (key, description)
VALUES
  ('items:read', 'Read files and folders'),
  ('items:write', 'Create and update files and folders'),
  ('items:delete', 'Delete files and folders'),
  ('items:share', 'Share files and folders'),
  ('users:manage', 'Manage users and roles'),
  ('roles:manage', 'Manage roles and permissions')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN ('items:read', 'items:write', 'items:delete', 'items:share')
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;
