-- 0004_copilot_retrieval.sql
-- Phase 4: grounded Copilot conversations and project-scoped semantic index.

CREATE TABLE IF NOT EXISTS copilot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES copilot_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]',
  tools_used text[] NOT NULL DEFAULT '{}',
  grounded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('version', 'memory', 'project')),
  source_id uuid NOT NULL,
  embedding vector(768) NOT NULL,
  embedding_model text NOT NULL,
  schema_version text NOT NULL DEFAULT 'copilot-embedding-v1',
  content_hash text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, embedding_model, schema_version)
);

CREATE INDEX IF NOT EXISTS idx_copilot_conversations_project_user
  ON copilot_conversations(project_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_conversation_created
  ON copilot_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_copilot_embeddings_project
  ON copilot_embeddings(project_id, source_type);
CREATE INDEX IF NOT EXISTS idx_copilot_embeddings_vector
  ON copilot_embeddings USING hnsw (embedding vector_cosine_ops);


CREATE OR REPLACE FUNCTION search_copilot_embeddings(
  project_id_arg uuid,
  owner_id_arg uuid,
  query_embedding vector(768),
  match_count integer DEFAULT 8
)
RETURNS TABLE (
  source_type text,
  source_id uuid,
  content text,
  similarity real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.source_type, e.source_id, e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM copilot_embeddings e
  JOIN projects p ON p.id = e.project_id
  WHERE e.project_id = project_id_arg
    AND p.owner_id = owner_id_arg
  ORDER BY e.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;
