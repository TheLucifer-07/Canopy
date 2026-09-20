import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000010';
const ASSET_ID = '00000000-0000-4000-8000-000000000020';
const V1_ID = '00000000-0000-4000-8000-000000000031';
const V2_ID = '00000000-0000-4000-8000-000000000032';
const V3_ID = '00000000-0000-4000-8000-000000000033';
const V4_ID = '00000000-0000-4000-8000-000000000034';
const FORK_PROJECT_ID = '00000000-0000-4000-8000-000000000011';

function now() {
  return new Date().toISOString();
}

function createFakeCoreRepository() {
  const project = {
    id: PROJECT_ID,
    owner_id: USER_ID,
    name: 'Launch exploration',
    creative_goal: null,
    version_sequence_counter: 0,
    archived_at: null,
    created_at: now(),
    updated_at: now()
  };
  const asset = {
    id: ASSET_ID,
    content_hash: 'a'.repeat(64),
    media_type: 'image',
    mime: 'image/png',
    storage_key: 'assets/aa/aa/hash',
    byte_size: 4,
    created_at: now()
  };
  const versions = [];
  const edges = [];
  const memories = [];
  const diffs = new Map();
  const aiRequests = [];
  const idempotencyRecords = new Map();

  return {
    async createProject({ ownerId, name, creativeGoal }) {
      return { ...project, owner_id: ownerId, name, creative_goal: creativeGoal };
    },
    async listProjects() {
      return [project];
    },
    async forkProject({ ownerId, sourceVersionId, name, creativeGoal }) {
      const source = versions.find((version) => version.id === sourceVersionId);
      if (!source) {
        const error = new Error('Fork source not found.');
        error.code = 'FORK_SOURCE_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      const forkedProject = {
        ...project,
        id: FORK_PROJECT_ID,
        owner_id: ownerId,
        name,
        creative_goal: creativeGoal,
        version_sequence_counter: 1
      };
      const root = {
        ...source,
        id: '00000000-0000-4000-8000-000000000034',
        project_id: FORK_PROJECT_ID,
        sequence: 1,
        is_root: true,
        origin_version_id: source.id
      };
      return {
        project: forkedProject,
        root_version: root,
        fork: {
          source_project_id: source.project_id,
          source_version_id: source.id,
          forked_project_id: FORK_PROJECT_ID
        }
      };
    },
    async assertProjectOwner({ projectId, ownerId }) {
      assert.equal(projectId, PROJECT_ID);
      assert.equal(ownerId, USER_ID);
      return project;
    },
    async uploadAssetBytes() {
      return asset;
    },
    async getGrantedAsset() {
      return asset;
    },
    async getVersion({ versionId }) {
      return versions.find((version) => version.id === versionId) || null;
    },
    async getVersionDetail({ versionId }) {
      const version = versions.find((candidate) => candidate.id === versionId);
      return version ? { ...version, action: null, parents: [], annotation: null, asset } : null;
    },
    async createVersion({ projectId, assetId, isRoot, parents, actor, action }) {
      const ids = [V1_ID, V2_ID, V3_ID, V4_ID];
      const version = {
        id: ids[versions.length] || `00000000-0000-4000-8000-0000000000${40 + versions.length}`,
        project_id: projectId,
        asset_id: assetId,
        sequence: versions.length + 1,
        actor_type: actor.type,
        actor_user_id: actor.userId,
        is_root: isRoot,
        capture_fidelity: action.captureFidelity,
        actions: [{ type: action.type, params: action.params, declared_delta: action.declaredDelta, replayable: action.replayable }],
        created_at: now()
      };
      versions.push(version);
      for (const parent of parents) edges.push({ version_id: version.id, ...parent });
      return version;
    },
    async createWorkingState({ versionId, ownerId }) {
      return {
        id: '00000000-0000-4000-8000-000000000040',
        project_id: PROJECT_ID,
        user_id: ownerId,
        base_version_id: versionId,
        ops: [],
        updated_at: now()
      };
    },
    async getLineage() {
      return { versions, edges };
    },
    async getLineageForVersions({ versionIds }) {
      for (const id of versionIds) assert.ok(versions.find((version) => version.id === id));
      return { versions, edges };
    },
    async createMemory({ projectId, ownerId, memory }) {
      const row = {
        id: '00000000-0000-4000-8000-000000000050',
        project_id: projectId,
        ...memory,
        created_by_user_id: ownerId,
        created_at: now(),
        updated_at: now()
      };
      memories.push(row);
      return row;
    },
    async listMemories() {
      return memories;
    },
    async getMemory({ memoryId }) {
      return memories.find((memory) => memory.id === memoryId) || null;
    },
    async updateMemoryStatus({ memoryId, status }) {
      const memory = memories.find((candidate) => candidate.id === memoryId);
      memory.status = status;
      return memory;
    },
    async editMemory({ memoryId, memory }) {
      const existing = memories.find((candidate) => candidate.id === memoryId);
      existing.status = 'superseded';
      const successor = { ...existing, id: '00000000-0000-4000-8000-000000000051', ...memory, status: 'active' };
      existing.superseded_by_memory_id = successor.id;
      memories.push(successor);
      return successor;
    },
    async createSignedAssetUrl() {
      return { asset_id: ASSET_ID, url: 'https://signed.example/asset', expires_in: 600 };
    },
    async downloadAssetBytes() {
      return { asset, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mime: 'image/png' };
    },
    async getAiUsageForToday() {
      return { tokens: aiRequests.reduce((sum, row) => sum + (row.inputTokens || 0) + (row.outputTokens || 0), 0), cost: 0 };
    },
    async logAiRequest(row) {
      aiRequests.push(row);
      return { id: `ai-${aiRequests.length}`, ...row };
    },
    async getIdempotencyRecord({ key, userId, route }) {
      return idempotencyRecords.get(`${userId}:${route}:${key}`) || null;
    },
    async storeIdempotencyRecord({ key, userId, route, requestHash, response }) {
      idempotencyRecords.set(`${userId}:${route}:${key}`, {
        key,
        user_id: userId,
        route,
        request_hash: requestHash,
        response
      });
    },
    async getSemanticDiff({ cacheKey }) {
      return diffs.get(cacheKey) || null;
    },
    async storeSemanticDiff({ diff }) {
      const row = { id: '00000000-0000-4000-8000-000000000060', ...diff };
      diffs.set(diff.cache_key, row);
      return row;
    }
  };
}

async function withServer(testFn) {
  const server = await buildServer({
    logger: false,
    repositories: { core: createFakeCoreRepository() },
    providerRegistry: createFakeProviderRegistry(),
    authenticate: async () => ({ userId: USER_ID, email: 'test@example.com', token: 'test' })
  });
  try {
    await testFn(server);
  } finally {
    await server.close();
  }
}

function createFakeProviderRegistry() {
  return {
    providers: [],
    forCapability(capability) {
      const error = new Error(`No provider for ${capability}`);
      error.code = 'AI_PROVIDER_UNAVAILABLE';
      throw error;
    },
    modelIdsForCache() {
      return [];
    },
    describe() {
      return [];
    }
  };
}

describe('Phase 1 core API routes', () => {
  it('creates projects through the authenticated Core path', async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/projects',
        headers: { authorization: 'Bearer test' },
        payload: { name: 'Launch exploration' }
      });
      assert.equal(response.statusCode, 201);
      assert.equal(response.json().owner_id, USER_ID);
    });
  });

  it('creates root and child versions, continue state, memory, and lineage', async () => {
    await withServer(async (server) => {
      const root = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test' },
        payload: { asset_id: ASSET_ID, label: 'V1' }
      });
      assert.equal(root.statusCode, 201);

      const child = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions`,
        headers: { authorization: 'Bearer test' },
        payload: {
          base_version_id: V1_ID,
          ops: [{ type: 'adjust', params: { brightness: 12 } }],
          label: 'V2'
        }
      });
      assert.equal(child.statusCode, 201);

      const working = await server.inject({
        method: 'POST',
        url: `/v1/versions/${V1_ID}/continue`,
        headers: { authorization: 'Bearer test' }
      });
      assert.equal(working.statusCode, 200);
      assert.equal(working.json().base_version_id, V1_ID);

      const memory = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/memories`,
        headers: { authorization: 'Bearer test' },
        payload: {
          type: 'decision',
          statement: 'Keep the warmer direction for the first client review.',
          source_refs: { versions: [V2_ID] }
        }
      });
      assert.equal(memory.statusCode, 201);

      const lineage = await server.inject({
        method: 'GET',
        url: `/v1/projects/${PROJECT_ID}/lineage`,
        headers: { authorization: 'Bearer test' }
      });
      assert.equal(lineage.statusCode, 200);
      assert.equal(lineage.json().versions.length, 2);
      assert.deepEqual(lineage.json().tips, [V2_ID]);
      assert.equal(lineage.json().edges[0].parent_version_id, V1_ID);
    });
  });

  it('does not create a version when continuing from an earlier version', async () => {
    await withServer(async (server) => {
      await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test' },
        payload: { asset_id: ASSET_ID, label: 'V1' }
      });

      const before = await server.inject({
        method: 'GET',
        url: `/v1/projects/${PROJECT_ID}/lineage`,
        headers: { authorization: 'Bearer test' }
      });
      assert.equal(before.json().versions.length, 1);

      const working = await server.inject({
        method: 'POST',
        url: `/v1/versions/${V1_ID}/continue`,
        headers: { authorization: 'Bearer test' }
      });
      assert.equal(working.statusCode, 200);

      const after = await server.inject({
        method: 'GET',
        url: `/v1/projects/${PROJECT_ID}/lineage`,
        headers: { authorization: 'Bearer test' }
      });
      assert.equal(after.json().versions.length, 1);
    });
  });

  it('rejects arbitrary operation JSON during commit validation', async () => {
    await withServer(async (server) => {
      await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test' },
        payload: { asset_id: ASSET_ID, label: 'V1' }
      });

      const response = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions`,
        headers: { authorization: 'Bearer test' },
        payload: {
          base_version_id: V1_ID,
          ops: [{ type: 'arbitrary_json', params: { unsafe: true } }]
        }
      });

      assert.equal(response.statusCode, 422);
      assert.equal(response.json().error.code, 'VALIDATION_FAILED');
    });
  });

  it('replays version creation for matching Idempotency-Key retries', async () => {
    await withServer(async (server) => {
      const payload = { asset_id: ASSET_ID, label: 'V1' };
      const first = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test', 'idempotency-key': 'retry-key-1' },
        payload
      });
      const second = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test', 'idempotency-key': 'retry-key-1' },
        payload
      });

      assert.equal(first.statusCode, 201);
      assert.equal(second.statusCode, 201);
      assert.equal(first.json().id, second.json().id);

      const conflict = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test', 'idempotency-key': 'retry-key-1' },
        payload: { asset_id: ASSET_ID, label: 'Different' }
      });
      assert.equal(conflict.statusCode, 409);
      assert.equal(conflict.json().error.code, 'IDEMPOTENCY_KEY_REUSED');
    });
  });

  it('forks a project without copying memories or source history', async () => {
    await withServer(async (server) => {
      await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/versions/import`,
        headers: { authorization: 'Bearer test' },
        payload: { asset_id: ASSET_ID, label: 'V1' }
      });
      await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/memories`,
        headers: { authorization: 'Bearer test' },
        payload: { type: 'decision', statement: 'Use warmer lighting.', source_refs: { versions: [V1_ID] } }
      });

      const fork = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/fork`,
        headers: { authorization: 'Bearer test' },
        payload: { source_version_id: V1_ID, name: 'Forked direction' }
      });

      assert.equal(fork.statusCode, 201);
      assert.equal(fork.json().project.id, FORK_PROJECT_ID);
      assert.equal(fork.json().root_version.origin_version_id, V1_ID);
      assert.equal(fork.json().fork.source_project_id, PROJECT_ID);
    });
  });

  it('creates a manual merge version with ordered multi-parent edges', async () => {
    await withServer(async (server) => {
      await server.inject({ method: 'POST', url: `/v1/projects/${PROJECT_ID}/versions/import`, headers: { authorization: 'Bearer test' }, payload: { asset_id: ASSET_ID } });
      await server.inject({ method: 'POST', url: `/v1/projects/${PROJECT_ID}/versions`, headers: { authorization: 'Bearer test' }, payload: { base_version_id: V1_ID, ops: [{ type: 'adjust', params: { brightness: 12 } }] } });
      await server.inject({ method: 'POST', url: `/v1/projects/${PROJECT_ID}/versions`, headers: { authorization: 'Bearer test' }, payload: { base_version_id: V1_ID, ops: [{ type: 'rotate', params: { degrees: 90 } }] } });

      const merge = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/merge`,
        headers: { authorization: 'Bearer test', 'idempotency-key': 'merge-1' },
        payload: { source_version_ids: [V2_ID, V3_ID], strategy: 'manual', resolutions: {}, label: 'Merged direction' }
      });

      assert.equal(merge.statusCode, 201);
      const lineage = await server.inject({ method: 'GET', url: `/v1/projects/${PROJECT_ID}/lineage`, headers: { authorization: 'Bearer test' } });
      const mergeEdges = lineage.json().edges.filter((edge) => edge.version_id === V4_ID);
      assert.equal(mergeEdges.length, 2);
    });
  });

  it('supports memory proposal, confirmation, archival, and edit-as-successor', async () => {
    await withServer(async (server) => {
      const proposed = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/memories/propose`,
        headers: { authorization: 'Bearer test' },
        payload: { type: 'preference', statement: 'The cinematic direction has stronger contrast.' }
      });
      assert.equal(proposed.statusCode, 201);
      assert.equal(proposed.json().status, 'proposed');

      const confirmed = await server.inject({ method: 'POST', url: `/v1/memories/${proposed.json().id}/confirm`, headers: { authorization: 'Bearer test' } });
      assert.equal(confirmed.json().status, 'active');

      const edited = await server.inject({
        method: 'PATCH',
        url: `/v1/memories/${proposed.json().id}`,
        headers: { authorization: 'Bearer test' },
        payload: { statement: 'The cinematic direction has stronger contrast and depth.' }
      });
      assert.equal(edited.statusCode, 200);
      assert.notEqual(edited.json().id, proposed.json().id);
    });
  });

  it('rejects memory that only restates lineage facts', async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: 'POST',
        url: `/v1/projects/${PROJECT_ID}/memories`,
        headers: { authorization: 'Bearer test' },
        payload: { type: 'insight', statement: 'V2 was created' }
      });
      assert.equal(response.statusCode, 422);
      assert.equal(response.json().error.code, 'MEMORY_LINEAGE_FACT');
    });
  });

  it('creates declared/path semantic diff without provider output', async () => {
    await withServer(async (server) => {
      await server.inject({ method: 'POST', url: `/v1/projects/${PROJECT_ID}/versions/import`, headers: { authorization: 'Bearer test' }, payload: { asset_id: ASSET_ID } });
      await server.inject({ method: 'POST', url: `/v1/projects/${PROJECT_ID}/versions`, headers: { authorization: 'Bearer test' }, payload: { base_version_id: V1_ID, ops: [{ type: 'adjust', params: { brightness: 12 } }] } });

      const diff = await server.inject({
        method: 'POST',
        url: '/v1/diffs',
        headers: { authorization: 'Bearer test' },
        payload: { from_version_id: V1_ID, to_version_id: V2_ID }
      });

      assert.equal(diff.statusCode, 201);
      assert.equal(diff.json().status, 'declared_only');
      assert.deepEqual(diff.json().evidence_used, ['declared', 'path']);
    });
  });
});
