import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 14 API client security contracts', () => {
  it('calls getSecurityStatus endpoint and parses response', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/me/security')) {
        return new Response(JSON.stringify({
          data: {
            account: { id: 'u-1', email: 'creator@canopy.design', auth_method: 'canopy_jwt_bearer' },
            session: { status: 'active', auth_method: 'jwt_bearer', multi_session_revocation: false },
            api_tokens: { active_count: 2, total_count: 3 },
            two_factor: { status: 'not_configured', configured: false },
            oauth: { status: 'not_configured', providers: [] },
            password: { status: 'bcrypt_hashed', configured: true },
            recent_activity: []
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'test-token' });

    const res = await client.getSecurityStatus();
    assert.equal(calls[0].url, 'http://api.test/v1/me/security');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(res.data.account.email, 'creator@canopy.design');
    assert.equal(res.data.session.status, 'active');
    assert.equal(res.data.api_tokens.active_count, 2);
    assert.equal(res.data.two_factor.status, 'not_configured');
    assert.equal(res.data.oauth.status, 'not_configured');

    mock.restoreAll();
  });
});
