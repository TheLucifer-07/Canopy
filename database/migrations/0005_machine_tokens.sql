-- 0005_machine_tokens.sql
-- Phase 5: scoped machine tokens for MCP/CLI surfaces.

CREATE TABLE IF NOT EXISTS api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_created
  ON api_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash
  ON api_tokens(token_hash);
