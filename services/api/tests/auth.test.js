import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authenticateRequest, generateApiToken, hashApiToken } from '../src/lib/auth.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';

function requestFor(token, row) {
  const updates = [];
  return {
    headers: { authorization: `Bearer ${token}` },
    server: {
      repositories: {
        core: {
          pool: {
            async query(sql, args) {
              if (sql.includes('FROM api_tokens')) return { rows: row ? [row] : [] };
              if (sql.includes('UPDATE api_tokens')) { updates.push(args[0]); return { rows: [] }; }
              return { rows: [{ id: USER_ID, email: 'owner@example.test' }] };
            }
          }
        }
      }
    },
    updates
  };
}

describe('Phase 5 API token auth', () => {
  it('accepts a scoped cnp_pat token and records token auth context', async () => {
    const token = generateApiToken();
    assert.ok(token.startsWith('cnp_pat_'));
    const row = { id: 'token-1', user_id: USER_ID, scopes: ['projects:read'], revoked_at: null, email: 'owner@example.test' };
    const request = requestFor(token, row);
    const auth = await authenticateRequest(request, 'projects:read');
    assert.equal(auth.kind, 'token');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.scopes, ['projects:read']);
    assert.equal(hashApiToken(token).length, 64);
  });

  it('rejects missing, invalid, revoked, and insufficient-scope machine tokens', async () => {
    await assert.rejects(() => authenticateRequest({ headers: {}, server: {} }, 'projects:read'), (error) => error.statusCode === 401);
    await assert.rejects(() => authenticateRequest(requestFor('cnp_pat_bad', null), 'projects:read'), (error) => error.statusCode === 401);
    await assert.rejects(() => authenticateRequest(requestFor('cnp_pat_revoked', { id: 'token-1', user_id: USER_ID, scopes: ['projects:read'], revoked_at: new Date().toISOString(), email: 'owner@example.test' }), 'projects:read'), (error) => error.statusCode === 401);
    await assert.rejects(() => authenticateRequest(requestFor('cnp_pat_read', { id: 'token-1', user_id: USER_ID, scopes: ['projects:read'], revoked_at: null, email: 'owner@example.test' }), 'versions:write'), (error) => error.statusCode === 403 && error.code === 'INSUFFICIENT_SCOPE');
  });
});
