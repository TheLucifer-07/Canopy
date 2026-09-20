-- 0001_core_platform.sql
-- Phase 1 Core Platform schema for Supabase Postgres.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  creative_goal text CHECK (creative_goal IS NULL OR char_length(creative_goal) <= 2000),
  version_sequence_counter integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id, archived_at);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text NOT NULL UNIQUE CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  media_type text NOT NULL DEFAULT 'image',
  mime text NOT NULL,
  storage_key text NOT NULL,
  thumb_storage_key text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_assets (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, asset_id)
);

CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  sequence integer NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'model')),
  actor_user_id uuid REFERENCES auth.users(id),
  actor_provider text,
  actor_model text,
  actor_on_behalf_of_user_id uuid REFERENCES auth.users(id),
  origin_version_id uuid REFERENCES versions(id),
  is_root boolean NOT NULL DEFAULT false,
  capture_fidelity text NOT NULL DEFAULT 'full' CHECK (capture_fidelity IN ('full', 'partial', 'output_only')),
  summary text,
  summary_embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, sequence),
  CHECK ((actor_type = 'human' AND actor_user_id IS NOT NULL) OR actor_type <> 'human'),
  CHECK ((actor_type = 'model' AND actor_provider IS NOT NULL AND actor_model IS NOT NULL AND actor_on_behalf_of_user_id IS NOT NULL) OR actor_type <> 'model')
);

CREATE INDEX IF NOT EXISTS idx_versions_project_created ON versions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_project_actor ON versions(project_id, actor_type);

CREATE TABLE IF NOT EXISTS version_parents (
  version_id uuid NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  parent_version_id uuid NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
  parent_index smallint NOT NULL CHECK (parent_index >= 0),
  role text NOT NULL CHECK (role IN ('primary', 'merge_source')),
  PRIMARY KEY (version_id, parent_version_id),
  UNIQUE (version_id, parent_index),
  CHECK (version_id <> parent_version_id)
);

CREATE INDEX IF NOT EXISTS idx_version_parents_parent ON version_parents(parent_version_id);

CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL UNIQUE REFERENCES versions(id) ON DELETE CASCADE,
  type text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}',
  declared_delta jsonb NOT NULL DEFAULT '{}',
  replayable boolean NOT NULL DEFAULT true,
  surface text NOT NULL CHECK (surface IN ('web', 'android', 'mcp', 'api', 'seed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
CREATE INDEX IF NOT EXISTS idx_actions_params ON actions USING gin(params);

CREATE TABLE IF NOT EXISTS provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL UNIQUE REFERENCES versions(id) ON DELETE CASCADE,
  source_tool text NOT NULL,
  provider text,
  model text,
  model_version_reported text,
  prompt text,
  instruction text,
  parameters jsonb,
  provider_request_id text,
  seed text,
  watermark text,
  missing_fields text[] NOT NULL DEFAULT '{}',
  inbound_c2pa_present boolean NOT NULL DEFAULT false,
  external_ids jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS version_annotations (
  version_id uuid PRIMARY KEY REFERENCES versions(id) ON DELETE CASCADE,
  label text,
  note text,
  branch_label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS working_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_version_id uuid NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
  ops jsonb NOT NULL DEFAULT '[]',
  preview_asset_id uuid REFERENCES assets(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, base_version_id)
);

CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('goal', 'constraint', 'preference', 'decision', 'rejection', 'insight', 'intent')),
  statement text NOT NULL CHECK (char_length(statement) BETWEEN 1 AND 500),
  rationale text,
  source_refs jsonb NOT NULL DEFAULT '{}',
  origin text NOT NULL CHECK (origin IN ('user_authored', 'ai_extracted', 'system')),
  status text NOT NULL CHECK (status IN ('proposed', 'active', 'superseded', 'archived')),
  superseded_by_memory_id uuid REFERENCES memories(id),
  confidence numeric(3,2),
  embedding vector(768),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_project_status_type ON memories(project_id, status, type);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_core_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable_history_table';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_versions_immutable_update ON versions;
CREATE TRIGGER trg_versions_immutable_update BEFORE UPDATE OR DELETE ON versions
FOR EACH ROW EXECUTE FUNCTION prevent_core_history_mutation();

DROP TRIGGER IF EXISTS trg_actions_immutable_update ON actions;
CREATE TRIGGER trg_actions_immutable_update BEFORE UPDATE OR DELETE ON actions
FOR EACH ROW EXECUTE FUNCTION prevent_core_history_mutation();

DROP TRIGGER IF EXISTS trg_version_parents_immutable_update ON version_parents;
CREATE TRIGGER trg_version_parents_immutable_update BEFORE UPDATE OR DELETE ON version_parents
FOR EACH ROW EXECUTE FUNCTION prevent_core_history_mutation();

CREATE OR REPLACE FUNCTION next_project_sequence(project_id_arg uuid)
RETURNS integer AS $$
DECLARE next_sequence integer;
BEGIN
  UPDATE projects
  SET version_sequence_counter = version_sequence_counter + 1,
      updated_at = now()
  WHERE id = project_id_arg
  RETURNING version_sequence_counter INTO next_sequence;

  IF next_sequence IS NULL THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;

  RETURN next_sequence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles own row" ON profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "project owners manage projects" ON projects
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners read granted assets" ON assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_assets pa
      JOIN projects p ON p.id = pa.project_id
      WHERE pa.asset_id = assets.id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners read project asset grants" ON project_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_assets.project_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "owners read versions" ON versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = versions.project_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "owners read version parents" ON version_parents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN projects p ON p.id = v.project_id
      WHERE v.id = version_parents.version_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners read actions" ON actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN projects p ON p.id = v.project_id
      WHERE v.id = actions.version_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners read provenance" ON provenance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN projects p ON p.id = v.project_id
      WHERE v.id = provenance.version_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners manage annotations" ON version_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN projects p ON p.id = v.project_id
      WHERE v.id = version_annotations.version_id AND p.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN projects p ON p.id = v.project_id
      WHERE v.id = version_annotations.version_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners manage working states" ON working_states
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "owners manage memories" ON memories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = memories.project_id AND p.owner_id = auth.uid())
  ) WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = memories.project_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "owners manage idempotency keys" ON idempotency_keys
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('canopy-assets', 'canopy-assets', false)
ON CONFLICT (id) DO NOTHING;
