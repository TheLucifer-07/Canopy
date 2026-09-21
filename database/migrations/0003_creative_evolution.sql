-- 0003_creative_evolution.sql
-- Phase 3: fork records, semantic diff cache, AI request logging, and fork RPC.

CREATE TABLE IF NOT EXISTS project_forks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  source_version_id uuid NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
  forked_project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_forks_source ON project_forks(source_project_id, source_version_id);

CREATE TABLE IF NOT EXISTS semantic_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_version_id uuid NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
  to_version_id uuid NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
  cache_key text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('complete', 'partial', 'declared_only', 'failed', 'unconnected')),
  path jsonb,
  summary text,
  facets jsonb NOT NULL DEFAULT '{}',
  contribution jsonb NOT NULL DEFAULT '{}',
  discrepancies jsonb NOT NULL DEFAULT '[]',
  confidence jsonb NOT NULL DEFAULT '{}',
  evidence_used text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_diffs_project_versions ON semantic_diffs(project_id, from_version_id, to_version_id);

CREATE TABLE IF NOT EXISTS ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  provider text NOT NULL,
  model text,
  status text NOT NULL CHECK (status IN ('pending', 'ok', 'error', 'skipped')),
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(10,4),
  error_code text,
  prompt_preview text CHECK (prompt_preview IS NULL OR char_length(prompt_preview) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE OR REPLACE FUNCTION create_project_fork(
  source_version_id_arg uuid,
  owner_id_arg uuid,
  name_arg text,
  creative_goal_arg text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  source_version versions;
  source_project projects;
  forked_project projects;
  forked_version versions;
  fork_record project_forks;
BEGIN
  SELECT * INTO source_version FROM versions WHERE id = source_version_id_arg;
  IF source_version.id IS NULL THEN
    RAISE EXCEPTION 'fork_source_not_found';
  END IF;

  SELECT * INTO source_project FROM projects
  WHERE id = source_version.project_id AND owner_id = owner_id_arg AND archived_at IS NULL;
  IF source_project.id IS NULL THEN
    RAISE EXCEPTION 'fork_access_denied';
  END IF;

  INSERT INTO projects (owner_id, name, creative_goal)
  VALUES (owner_id_arg, name_arg, creative_goal_arg)
  RETURNING * INTO forked_project;

  INSERT INTO project_assets (project_id, asset_id)
  VALUES (forked_project.id, source_version.asset_id)
  ON CONFLICT DO NOTHING;

  UPDATE projects
  SET version_sequence_counter = version_sequence_counter + 1,
      updated_at = now()
  WHERE id = forked_project.id;

  INSERT INTO versions (
    project_id,
    asset_id,
    sequence,
    actor_type,
    actor_user_id,
    origin_version_id,
    is_root,
    capture_fidelity
  )
  VALUES (
    forked_project.id,
    source_version.asset_id,
    1,
    'human',
    owner_id_arg,
    source_version.id,
    true,
    source_version.capture_fidelity
  )
  RETURNING * INTO forked_version;

  INSERT INTO actions (version_id, type, params, declared_delta, replayable, surface)
  VALUES (
    forked_version.id,
    'fork',
    jsonb_build_object('source_project_id', source_project.id, 'source_version_id', source_version.id),
    jsonb_build_object('facets', jsonb_build_array(jsonb_build_object('kind', 'fork_origin'))),
    true,
    'api'
  );

  INSERT INTO provenance (version_id, source_tool, parameters, missing_fields)
  VALUES (
    forked_version.id,
    'canopy-fork',
    jsonb_build_object('source_project_id', source_project.id, 'source_version_id', source_version.id),
    '{}'
  );

  INSERT INTO version_annotations (version_id, label, note)
  VALUES (forked_version.id, 'Fork origin', NULL);

  INSERT INTO project_forks (source_project_id, source_version_id, forked_project_id, created_by_user_id)
  VALUES (source_project.id, source_version.id, forked_project.id, owner_id_arg)
  RETURNING * INTO fork_record;

  RETURN jsonb_build_object(
    'project', to_jsonb(forked_project),
    'root_version', to_jsonb(forked_version),
    'fork', to_jsonb(fork_record)
  );
END;
$$;
