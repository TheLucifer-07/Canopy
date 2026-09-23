-- 0006_user_profiles.sql
-- Phase 11: Extended user profiles, creative bio, location, website, and preferences

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ensure unique username if populated
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(lower(username)) WHERE username IS NOT NULL;

-- Backfill profile records for all existing users
INSERT INTO profiles (id, display_name, username)
SELECT id, display_name, split_part(email::text, '@', 1)
FROM users
ON CONFLICT (id) DO NOTHING;
