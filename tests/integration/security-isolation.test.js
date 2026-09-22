import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../../services/api/src/server.js';
import { ApiError } from '../../services/api/src/lib/errors.js';

const ALICE_ID = '00000000-0000-4000-8000-000000000001';
const BOB_ID = '00000000-0000-4000-8000-000000000002';
const ALICE_PROJECT_ID = '00000000-0000-4000-8000-000000000010';

function createMockCoreRepository() {
  const projects = [
    {
      id: ALICE_PROJECT_ID,
      owner_id: ALICE_ID,
      name: "Alice's Secret Project",
      creative_goal: 'Internal design',
      version_sequence_counter: 1,
      archived_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  return {
    pool: {
      async query() { return { rows: [] }; }
    },
    async getProject({ projectId, ownerId }) {
      const proj = projects.find((p) => p.id === projectId && p.owner_id === ownerId);
      if (!proj) throw new ApiError('PROJECT_NOT_FOUND', 'Project not found.', { statusCode: 404 });
      return proj;
    },
    async listProjects({ ownerId }) {
      return projects.filter((p) => p.owner_id === ownerId);
    },
    async assertProjectOwner({ projectId, ownerId }) {
      const proj = projects.find((p) => p.id === projectId && p.owner_id === ownerId);
      if (!proj) throw new ApiError('PROJECT_NOT_FOUND', 'Project not found.', { statusCode: 404 });
      return proj;
    },
    async getLineage({ projectId, ownerId }) {
      await this.assertProjectOwner({ projectId, ownerId });
      return { versions: [], edges: [], tips: [], branch_points: [] };
    },
    async listMemories({ projectId, ownerId }) {
      await this.assertProjectOwner({ projectId, ownerId });
      return [];
    }
  };
}

describe('Cross-User Security & Isolation Integration Tests', () => {
  it('prevents Bob from accessing Alice project resources', async () => {
    const mockRepo = createMockCoreRepository();
    const server = await buildServer({
      repositories: { core: mockRepo },
      authenticate: async (req) => {
        const header = req.headers.authorization || '';
        const token = header.slice(7);
        const userId = token === 'alice-token' ? ALICE_ID : BOB_ID;
        return { kind: 'user', userId, email: token === 'alice-token' ? 'alice@test' : 'bob@test', scopes: ['*'] };
      }
    });

    try {
      // Alice gets her project -> 200
      const aliceGet = await server.inject({
        method: 'GET',
        url: `/v1/projects/${ALICE_PROJECT_ID}`,
        headers: { authorization: 'Bearer alice-token' }
      });
      assert.equal(aliceGet.statusCode, 200);

      // Bob gets Alice's project -> 404
      const bobGet = await server.inject({
        method: 'GET',
        url: `/v1/projects/${ALICE_PROJECT_ID}`,
        headers: { authorization: 'Bearer bob-token' }
      });
      assert.equal(bobGet.statusCode, 404);

      // Bob gets lineage of Alice's project -> 404
      const bobLineage = await server.inject({
        method: 'GET',
        url: `/v1/projects/${ALICE_PROJECT_ID}/lineage`,
        headers: { authorization: 'Bearer bob-token' }
      });
      assert.equal(bobLineage.statusCode, 404);

      // Bob gets memories of Alice's project -> 404
      const bobMemories = await server.inject({
        method: 'GET',
        url: `/v1/projects/${ALICE_PROJECT_ID}/memories`,
        headers: { authorization: 'Bearer bob-token' }
      });
      assert.equal(bobMemories.statusCode, 404);
    } finally {
      await server.close();
    }
  });
});
