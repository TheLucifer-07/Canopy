import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 2 API client auth contract', () => {
  it('calls the real login and register endpoints', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ access_token: 'token', user: { email: 'user@example.test' } }), {
        status: options.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1' });
    await client.login({ email: 'user@example.test', password: 'canopy-demo-pass' });
    await client.register({ email: 'new@example.test', password: 'canopy-demo-pass', display_name: 'New User' });

    assert.equal(calls[0].url, 'http://api.test/v1/auth/login');
    assert.equal(calls[1].url, 'http://api.test/v1/auth/register');
    assert.equal(JSON.parse(calls[1].options.body).display_name, 'New User');
    mock.restoreAll();
  });
});
