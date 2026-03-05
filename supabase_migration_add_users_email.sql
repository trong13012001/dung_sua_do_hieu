-- Add email to users table (required for auth linking and employee creation).
-- Run this if your users table was created without email.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Optional: backfill or leave NULL for existing rows.
