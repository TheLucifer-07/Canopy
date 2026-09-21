-- 0002_atomic_version_creation.sql
-- Phase 2 prerequisite: create the authoritative version/action/parent/provenance
-- write in one PostgreSQL transaction via a database function.

CREATE OR REPLACE FUNCTION create_core_version(
  project_id_arg uuid,
  owner_id_arg uuid,
  asset_id_arg uuid,
  is_root_arg boolean,
  parents_arg jsonb,
  actor_type_arg text,
  actor_user_id_arg uuid,
  action_type_arg text,
  action_params_arg jsonb,
  declared_delta_arg jsonb,
  replayable_arg boolean,
  surface_arg text,
  capture_fidelity_arg text,
  source_tool_arg text,
  label_arg text DEFAULT NULL,
  note_arg text DEFAULT NULL
)
RETURNS versions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_version versions;
  next_sequence integer;
  parent_record jsonb;
  parent_id uuid;
  parent_project_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_arg AND owner_id = owner_id_arg AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM project_assets
    WHERE project_id = project_id_arg AND asset_id = asset_id_arg
  ) THEN
    RAISE EXCEPTION 'asset_not_granted';
  END IF;

  IF is_root_arg THEN
    IF jsonb_array_length(COALESCE(parents_arg, '[]'::jsonb)) <> 0 THEN
      RAISE EXCEPTION 'root_version_cannot_have_parents';
    END IF;
  ELSE
    IF jsonb_array_length(COALESCE(parents_arg, '[]'::jsonb)) = 0 THEN
      RAISE EXCEPTION 'version_requires_parent';
    END IF;

    FOR parent_record IN SELECT * FROM jsonb_array_elements(parents_arg)
    LOOP
      parent_id := (parent_record ->> 'parent_version_id')::uuid;
      SELECT project_id INTO parent_project_id FROM versions WHERE id = parent_id;
      IF parent_project_id IS NULL OR parent_project_id <> project_id_arg THEN
        RAISE EXCEPTION 'invalid_parent';
      END IF;
    END LOOP;
  END IF;

  UPDATE projects
  SET version_sequence_counter = version_sequence_counter + 1,
      updated_at = now()
  WHERE id = project_id_arg
  RETURNING version_sequence_counter INTO next_sequence;

  INSERT INTO versions (
    project_id,
    asset_id,
    sequence,
    actor_type,
    actor_user_id,
    is_root,
    capture_fidelity
  )
  VALUES (
    project_id_arg,
    asset_id_arg,
    next_sequence,
    actor_type_arg,
    actor_user_id_arg,
    is_root_arg,
    capture_fidelity_arg
  )
  RETURNING * INTO created_version;

  IF NOT is_root_arg THEN
    INSERT INTO version_parents (version_id, parent_version_id, parent_index, role)
    SELECT
      created_version.id,
      (edge ->> 'parent_version_id')::uuid,
      (edge ->> 'parent_index')::smallint,
      edge ->> 'role'
    FROM jsonb_array_elements(parents_arg) AS edge;
  END IF;

  INSERT INTO actions (
    version_id,
    type,
    params,
    declared_delta,
    replayable,
    surface
  )
  VALUES (
    created_version.id,
    action_type_arg,
    action_params_arg,
    declared_delta_arg,
    replayable_arg,
    surface_arg
  );

  INSERT INTO provenance (
    version_id,
    source_tool,
    parameters,
    missing_fields
  )
  VALUES (
    created_version.id,
    source_tool_arg,
    action_params_arg,
    '{}'
  );

  INSERT INTO version_annotations (
    version_id,
    label,
    note
  )
  VALUES (
    created_version.id,
    label_arg,
    note_arg
  );

  RETURN created_version;
END;
$$;
