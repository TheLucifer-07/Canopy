import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 6 API client asset contract', () => {
  it('calls listProjectAssets endpoint with bearer authorization', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        project_id: 'project-1',
        assets: [
          { id: 'asset-1', media_type: 'image', mime: 'image/jpeg', byte_size: 1024, related_versions: [] }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'pat-token' });
    const result = await client.listProjectAssets('project-1');

    assert.equal(calls[0].url, 'http://api.test/v1/projects/project-1/assets');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer pat-token');
    assert.equal(result.project_id, 'project-1');
    assert.equal(result.assets.length, 1);
    mock.restoreAll();
  });

  it('calls getAsset detail endpoint with bearer authorization', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        id: 'asset-1',
        media_type: 'image',
        mime: 'image/png',
        byte_size: 2048,
        related_versions: [{ id: 'v-1', sequence: 1, label: 'V1' }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'pat-token' });
    const result = await client.getAsset('asset-1');

    assert.equal(calls[0].url, 'http://api.test/v1/assets/asset-1');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer pat-token');
    assert.equal(result.id, 'asset-1');
    assert.equal(result.related_versions.length, 1);
    mock.restoreAll();
  });
});
