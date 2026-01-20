-- Migration: 003_add_user_columns.sql
-- Created: 2026-01-20
-- Description: Add missing columns to users table (nickname, google_id, auth_provider, avatar_url)

-- UP

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for google_id lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- DOWN

DROP INDEX IF EXISTS idx_users_google_id;
ALTER TABLE users DROP COLUMN IF EXISTS nickname;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
