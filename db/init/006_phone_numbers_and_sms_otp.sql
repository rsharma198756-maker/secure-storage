-- Migration: add user phone numbers for SMS OTP delivery

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique_idx
  ON users (phone_number)
  WHERE phone_number IS NOT NULL;
