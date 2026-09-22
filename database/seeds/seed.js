/**
 * Deterministic Canopy Demo Seed Script
 *
 * Creates a real PostgreSQL-backed demo:
 * V1 import -> V2 human adjust -> V3 model generation -> V4 text branch -> V5 merge
 */

import pg from 'pg';
import { ACTOR_TYPES, ACTION_TYPES, MEMORY_STATUS, MEMORY_TYPES } from '@canopy/config';
import { buildDeclaredDelta, validateParentSet } from '@canopy/domain';
import { hashPassword } from '../../services/api/src/lib/auth.js';
import { PostgresCoreRepository } from '../../services/api/src/repositories/postgresCoreRepository.js';
import { config } from '../../services/api/src/lib/config.js';

const { Pool } = pg;

export const DEMO_USER = Object.freeze({
  email: 'demo@canopy.local',
  password: 'canopy-demo-pass',
  displayName: 'Canopy Demo'
});

export const DEMO_PROJECT_SEED = Object.freeze({
  project: {
    name: 'Neon Campaign',
    creative_goal: 'Create a high-contrast energetic neon product graphic for digital launch.'
  },
  memory: {
    type: MEMORY_TYPES.INSIGHT,
    statement: 'Client rejects blue-dominant backgrounds because they read as corporate.',
    rationale: 'Use warmer neon accents and dark contrast for launch visuals.'
  }
});

const DEMO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

export async function runSeed(pool = null) {
  const ownsPool = !pool;
  const activePool = pool || new Pool(config.database.url ? { connectionString: config.database.url } : {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false
  });

  try {
    const repository = new PostgresCoreRepository({ pool: activePool });
    const user = await upsertDemoUser(activePool);
    const project = await getOrCreateProject(activePool, user.id);
    const existingLineage = await repository.getLineage({ projectId: project.id, ownerId: user.id });

    if (existingLineage.versions.length > 0) {
      await ensureDemoMemory(repository, project.id, user.id, existingLineage.versions.at(-1)?.id);
      console.log(`✓ Canopy Seed: Demo project already exists with ${existingLineage.versions.length} version(s).`);
      return { user: publicUser(user), project, lineage: existingLineage };
    }

    const asset = await repository.uploadAssetBytes({
      projectId: project.id,
      ownerId: user.id,
      bytes: DEMO_PNG,
      mime: 'image/png'
    });

    const v1 = await repository.createVersion({
      projectId: project.id,
      ownerId: user.id,
      assetId: asset.id,
      isRoot: true,
      parents: validateParentSet({ isRoot: true, parents: [] }),
      actor: { type: ACTOR_TYPES.HUMAN, userId: user.id },
      action: action(ACTION_TYPES.IMPORT, { asset_id: asset.id }, 'canopy-seed-import'),
      annotation: { label: 'V1 Import', note: 'Original creative asset imported into Canopy.' }
    });

    const v2 = await repository.createVersion({
      projectId: project.id,
      ownerId: user.id,
      assetId: asset.id,
      isRoot: false,
      parents: validateParentSet({ parents: [v1.id] }),
      actor: { type: ACTOR_TYPES.HUMAN, userId: user.id },
      action: action(ACTION_TYPES.COMMIT, {
        base_version_id: v1.id,
        ops: [{ type: 'adjust', params: { brightness: 18 } }]
      }, 'canopy-seed-web'),
      annotation: { label: 'V2 Human adjust', note: 'Designer lifted brightness for a stronger product read.' }
    });

    const v3 = await repository.createVersion({
      projectId: project.id,
      ownerId: user.id,
      assetId: asset.id,
      isRoot: false,
      parents: validateParentSet({ parents: [v2.id] }),
      actor: {
        type: ACTOR_TYPES.MODEL,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        onBehalfOfUserId: user.id
      },
      action: {
        ...action(ACTION_TYPES.GENERATE, {
          prompt: 'Replace the background with a dark glowing neon grid.',
          base_version_id: v2.id
        }, 'canopy-seed-gemini'),
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        prompt: 'Replace the background with a dark glowing neon grid.',
        captureFidelity: 'partial',
        missingFields: ['seed: provider request id not available']
      },
      annotation: { label: 'V3 Model background', note: 'AI-generated neon grid exploration.' }
    });

    const v4 = await repository.createVersion({
      projectId: project.id,
      ownerId: user.id,
      assetId: asset.id,
      isRoot: false,
      parents: validateParentSet({ parents: [v2.id] }),
      actor: { type: ACTOR_TYPES.HUMAN, userId: user.id },
      action: action(ACTION_TYPES.COMMIT, {
        base_version_id: v2.id,
        ops: [{ type: 'text', params: { value: 'CANOPY NEON' } }]
      }, 'canopy-seed-web'),
      annotation: { label: 'V4 Text branch', note: 'Alternate branch with launch text overlay.' }
    });

    const v5 = await repository.createVersion({
      projectId: project.id,
      ownerId: user.id,
      assetId: asset.id,
      isRoot: false,
      parents: validateParentSet({ parents: [v3.id, v4.id] }),
      actor: { type: ACTOR_TYPES.HUMAN, userId: user.id },
      action: action(ACTION_TYPES.MERGE, {
        source_version_ids: [v3.id, v4.id],
        ops: [
          { type: 'adjust', params: { brightness: 18 } },
          { type: 'text', params: { value: 'CANOPY NEON' } }
        ],
        conflicts: []
      }, 'canopy-seed-merge'),
      annotation: { label: 'V5 Manual merge', note: 'Merged the model background direction with the text branch.' }
    });

    await ensureDemoMemory(repository, project.id, user.id, v5.id);
    const lineage = await repository.getLineage({ projectId: project.id, ownerId: user.id });
    console.log(`✓ Canopy Seed: Populated "${project.name}" for ${DEMO_USER.email}.`);
    console.log(`  Password: ${DEMO_USER.password}`);
    return { user: publicUser(user), project, lineage };
  } finally {
    if (ownsPool) await activePool.end();
  }
}

async function upsertDemoUser(pool) {
  return (await pool.query(
    `INSERT INTO users(email,password_hash,display_name)
     VALUES($1,$2,$3)
     ON CONFLICT(email) DO UPDATE
       SET password_hash=EXCLUDED.password_hash,
           display_name=EXCLUDED.display_name,
           updated_at=now()
     RETURNING id,email,display_name,created_at,updated_at`,
    [DEMO_USER.email, hashPassword(DEMO_USER.password), DEMO_USER.displayName]
  )).rows[0];
}

async function getOrCreateProject(pool, ownerId) {
  const existing = (await pool.query(
    'SELECT * FROM projects WHERE owner_id=$1 AND name=$2 AND archived_at IS NULL ORDER BY created_at LIMIT 1',
    [ownerId, DEMO_PROJECT_SEED.project.name]
  )).rows[0];
  if (existing) return existing;
  return (await pool.query(
    'INSERT INTO projects(owner_id,name,creative_goal) VALUES($1,$2,$3) RETURNING *',
    [ownerId, DEMO_PROJECT_SEED.project.name, DEMO_PROJECT_SEED.project.creative_goal]
  )).rows[0];
}

async function ensureDemoMemory(repository, projectId, ownerId, versionId) {
  const memories = await repository.listMemories({ projectId, ownerId, status: MEMORY_STATUS.ACTIVE });
  const exists = memories.some((memory) => memory.statement === DEMO_PROJECT_SEED.memory.statement);
  if (exists) return null;
  return repository.createMemory({
    projectId,
    ownerId,
    memory: {
      ...DEMO_PROJECT_SEED.memory,
      origin: 'user_authored',
      status: MEMORY_STATUS.ACTIVE,
      source_refs: versionId ? { versions: [versionId] } : {}
    }
  });
}

function action(type, params, sourceTool) {
  return {
    type,
    params,
    declaredDelta: buildDeclaredDelta(type, params),
    replayable: true,
    surface: 'seed',
    captureFidelity: 'full',
    sourceTool
  };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
