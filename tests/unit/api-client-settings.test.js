import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 13 API client settings contracts', () => {
  it('calls getSettings and updateSettings endpoints', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/me/settings') && options.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return new Response(JSON.stringify({
          account: { email: 'alex@canopy.design' },
          appearance: { theme: body.appearance?.theme || 'dark', density: 'compact', reduced_motion: false },
          preferences: { default_landing: 'projects' },
          security: { session_type: 'jwt_bearer' },
          ai: { diff_detail_level: 'deep' },
          connected_services: [{ id: 'mcp', status: 'ready' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.endsWith('/me/settings')) {
        return new Response(JSON.stringify({
          account: { email: 'alex@canopy.design' },
          appearance: { theme: 'dark', density: 'comfortable', reduced_motion: false },
          preferences: { default_landing: 'dashboard' },
          security: { session_type: 'jwt_bearer' },
          ai: { diff_detail_level: 'standard' },
          connected_services: [{ id: 'mcp', status: 'ready' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'test-token' });

    const settings = await client.getSettings();
    assert.equal(calls[0].url, 'http://api.test/v1/me/settings');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(settings.account.email, 'alex@canopy.design');
    assert.equal(settings.appearance.theme, 'dark');

    const updated = await client.updateSettings({
      appearance: { theme: 'system', density: 'compact' },
      ai: { diff_detail_level: 'deep' }
    });
    assert.equal(calls[1].url, 'http://api.test/v1/me/settings');
    assert.equal(calls[1].options.method, 'PATCH');
    assert.equal(updated.appearance.theme, 'system');
    assert.equal(updated.ai.diff_detail_level, 'deep');

    mock.restoreAll();
  });
});
