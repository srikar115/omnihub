-- Migration: 002_add_default_admin.sql
-- Created: 2026-01-20
-- Description: Insert default admin account

-- UP
INSERT INTO admins (id, username, password, created_at) 
VALUES (
  gen_random_uuid()::text,
  'admin', 
  '$2a$10$xVqYLGxPz9y8oN5Z3Gk4S.HxGGxNxZ6U8k9qRKhRqL6XKwQZwQZwQ',
  NOW()
)
ON CONFLICT (username) DO NOTHING;


-- DOWN
DELETE FROM admins WHERE username = 'admin';
