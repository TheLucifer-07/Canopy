import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 8 API client memory contract', () => {
  it('calls getMemory, confirmMemory, and archiveMemory with proper routes and auth', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        id: 'mem-1',
        statement: 'Client rejects blue-dominant backgrounds.',
        origin: 'user_authored',
        status: 'active'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'pat-token' });
    const memory = await client.getMemory('mem-1');
    await client.confirmMemory('mem-1');
    await client.archiveMemory('mem-1');

    assert.equal(calls[0].url, 'http://api.test/v1/memories/mem-1');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer pat-token');
    assert.equal(calls[1].url, 'http://api.test/v1/memories/mem-1/confirm');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[2].url, 'http://api.test/v1/memories/mem-1/archive');
    assert.equal(calls[2].options.method, 'POST');
    assert.equal(memory.id, 'mem-1');
    mock.restoreAll();
  });
});
