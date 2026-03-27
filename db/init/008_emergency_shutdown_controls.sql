-- Migration: standalone emergency shutdown controls

CREATE TABLE IF NOT EXISTS emergency_shutdown_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  shutdown_active boolean NOT NULL DEFAULT false,
  shutdown_reason text,
  shutdown_started_at timestamptz,
  shutdown_ended_at timestamptz,
  shutdown_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO emergency_shutdown_controls (id, shutdown_active)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;
