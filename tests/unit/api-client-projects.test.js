import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 4 API client project contract', () => {
  it('calls project update and archive endpoints', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(options.method === 'DELETE' ? null : JSON.stringify({ id: 'project-1' }), {
        status: options.method === 'DELETE' ? 204 : 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'test-token' });
    await client.updateProject('project-1', { name: 'Updated', creative_goal: 'Prepare launch review.' });
    await client.archiveProject('project-1');

    assert.equal(calls[0].url, 'http://api.test/v1/projects/project-1');
    assert.equal(calls[0].options.method, 'PATCH');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(calls[0].options.body), { name: 'Updated', creative_goal: 'Prepare launch review.' });
    assert.equal(calls[1].url, 'http://api.test/v1/projects/project-1');
    assert.equal(calls[1].options.method, 'DELETE');
    mock.restoreAll();
  });
});
