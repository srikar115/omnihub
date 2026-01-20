-- Migration: Add refresh tokens table for secure token rotation
-- Created: 2026-01-20

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  replaced_by_token TEXT NULL,
  user_agent TEXT NULL,
  ip_address TEXT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Cleanup function for expired tokens (optional, can be run periodically)
-- DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP OR revoked_at IS NOT NULL;

COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT token rotation mechanism';
COMMENT ON COLUMN refresh_tokens.token IS 'The refresh token value (UUID)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When this refresh token expires';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When this token was revoked (logout or rotation)';
COMMENT ON COLUMN refresh_tokens.replaced_by_token IS 'The new token that replaced this one during rotation';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Browser/client user agent for session tracking';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address for security auditing';
