import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 7 API client diff contract', () => {
  it('calls /diffs endpoint with from_version_id and to_version_id', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        id: 'diff-1',
        from_version_id: 'v-1',
        to_version_id: 'v-2',
        status: 'complete',
        summary: 'Lighting enhanced and background adjusted.',
        evidence_used: ['declared', 'path', 'observed'],
        confidence: { overall: 0.95 }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'pat-token' });
    const result = await client.createDiff({
      from_version_id: 'v-1',
      to_version_id: 'v-2',
      force_refresh: true
    });

    assert.equal(calls[0].url, 'http://api.test/v1/diffs');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer pat-token');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      from_version_id: 'v-1',
      to_version_id: 'v-2',
      force_refresh: true
    });
    assert.equal(result.from_version_id, 'v-1');
    assert.equal(result.status, 'complete');
    mock.restoreAll();
  });
});
