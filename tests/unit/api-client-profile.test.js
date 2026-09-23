import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 11 API client profile and activity contract', () => {
  it('calls getProfile, updateProfile, and getActivity endpoints', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/me/profile') && options.method === 'PATCH') {
        return new Response(JSON.stringify({ id: 'user-1', display_name: 'Alex Mercer', username: 'alex_mercer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.endsWith('/me/profile')) {
        return new Response(JSON.stringify({ id: 'user-1', display_name: 'Alex', username: 'alex' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('/me/activity')) {
        return new Response(JSON.stringify({ data: [{ id: 'act-1', action: 'Created version' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'test-token' });
    const profile = await client.getProfile();
    const updated = await client.updateProfile({ display_name: 'Alex Mercer', username: 'alex_mercer' });
    const activity = await client.getActivity({ limit: 10 });

    assert.equal(calls[0].url, 'http://api.test/v1/me/profile');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
    assert.equal(profile.display_name, 'Alex');

    assert.equal(calls[1].url, 'http://api.test/v1/me/profile');
    assert.equal(calls[1].options.method, 'PATCH');
    assert.deepEqual(JSON.parse(calls[1].options.body), { display_name: 'Alex Mercer', username: 'alex_mercer' });
    assert.equal(updated.display_name, 'Alex Mercer');

    assert.equal(calls[2].url, 'http://api.test/v1/me/activity?limit=10');
    assert.equal(calls[2].options.method || 'GET', 'GET');
    assert.equal(activity.data.length, 1);

    mock.restoreAll();
  });
});
