import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 5 API client version contract', () => {
  it('calls listProjectVersions endpoint with bearer authorization', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        project_id: 'project-1',
        versions: [
          { id: 'v-1', sequence: 1, label: 'V1', parent_ids: [] },
          { id: 'v-2', sequence: 2, label: 'V2', parent_ids: ['v-1'] }
        ],
        edges: [{ parent_id: 'v-1', child_id: 'v-2' }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'pat-token' });
    const result = await client.listProjectVersions('project-1');

    assert.equal(calls[0].url, 'http://api.test/v1/projects/project-1/versions');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer pat-token');
    assert.equal(result.project_id, 'project-1');
    assert.equal(result.versions.length, 2);
    assert.equal(result.edges.length, 1);
    mock.restoreAll();
  });
});
