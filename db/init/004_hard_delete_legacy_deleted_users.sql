-- Migration: permanently remove legacy soft-deleted users
-- Context: old builds could mark users as status='deleted' without removing rows.
-- This cleanup ensures those rows no longer block re-creating the same email.

UPDATE audit_logs
SET actor_user_id = NULL
WHERE actor_user_id IN (
  SELECT id FROM users WHERE status = 'deleted'
);

UPDATE refresh_tokens
SET revoked_by_user_id = NULL
WHERE revoked_by_user_id IN (
  SELECT id FROM users WHERE status = 'deleted'
);

UPDATE security_controls
SET tap_off_by_user_id = NULL,
    updated_at = now()
WHERE tap_off_by_user_id IN (
  SELECT id FROM users WHERE status = 'deleted'
);

DELETE FROM item_grants
WHERE subject_type = 'user'
  AND subject_id IN (
    SELECT id FROM users WHERE status = 'deleted'
  );

DELETE FROM otp_tokens
WHERE email IN (
  SELECT email FROM users WHERE status = 'deleted'
);

DELETE FROM users
WHERE status = 'deleted';
