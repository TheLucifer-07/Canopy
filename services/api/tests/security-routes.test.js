import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';
import { issueAccessToken, generateApiToken, hashApiToken } from '../src/lib/auth.js';

class InMemorySecurityRepo {
  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.notifications = [];
  }

  async getUserSecurityStatus({ userId }) {
    const user = this.users.get(userId);
    if (!user) return null;

    const userTokens = Array.from(this.tokens.values()).filter((t) => t.user_id === userId);
    const activeTokens = userTokens.filter((t) => !t.revoked_at);

    return {
      account: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        username: user.email.split('@')[0],
        auth_method: 'canopy_jwt_bearer',
        created_at: user.created_at || new Date().toISOString()
      },
      session: {
        status: 'active',
        auth_method: 'jwt_bearer',
        ttl_seconds: 604800,
        multi_session_revocation: false,
        notice: 'Current session is authenticated via signed cryptographic JWT bearer token.'
      },
      api_tokens: {
        active_count: activeTokens.length,
        total_count: userTokens.length
      },
      two_factor: {
        status: 'not_configured',
        configured: false,
        supported_methods: [],
        notice: 'Two-Factor Authentication (TOTP / WebAuthn) is not configured in this prototype deployment.'
      },
      oauth: {
        status: 'not_configured',
        providers: [],
        notice: 'External OAuth providers (Google, GitHub, Figma) are not configured for this prototype.'
      },
      password: {
        status: 'bcrypt_hashed',
        configured: true,
        notice: 'Primary password credentials are salted and hashed with bcrypt in PostgreSQL.'
      },
      recent_activity: []
    };
  }

  get pool() {
    return {
      query: async (text, params) => {
        if (text.includes('SELECT id,email FROM users') || text.includes('SELECT id,email,display_name')) {
          const userId = params[0];
          const u = this.users.get(userId);
          return { rows: u ? [u] : [] };
        }
        if (text.includes('SELECT id,name,token_prefix,scopes,revoked_at,last_used_at,created_at FROM api_tokens')) {
          const userId = params[0];
          const rows = Array.from(this.tokens.values())
            .filter((t) => t.user_id === userId)
            .map(({ token_hash, ...safe }) => safe);
          return { rows };
        }
        if (text.includes('INSERT INTO api_tokens')) {
          const [userId, name, tokenHash, tokenPrefix, scopes] = params;
          const id = '00000000-0000-4000-8000-000000000099';
          const tokenRow = {
            id,
            user_id: userId,
            name,
            token_hash: tokenHash,
            token_prefix: tokenPrefix,
            scopes,
            created_at: new Date().toISOString(),
            revoked_at: null,
            last_used_at: null
          };
          this.tokens.set(id, tokenRow);
          return { rows: [{ id, name, token_prefix: tokenPrefix, scopes, created_at: tokenRow.created_at }] };
        }
        if (text.includes('UPDATE api_tokens SET revoked_at=now()')) {
          const [tokenId, userId] = params;
          const tok = this.tokens.get(tokenId);
          if (tok && tok.user_id === userId) {
            tok.revoked_at = new Date().toISOString();
            return { rowCount: 1, rows: [{ id: tokenId }] };
          }
          return { rowCount: 0, rows: [] };
        }
        return { rows: [] };
      }
    };
  }
}

describe('Phase 14 Security Routes & Tenancy Isolation', () => {
  let server;
  let repo;
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  before(async () => {
    repo = new InMemorySecurityRepo();
    userA = { id: '00000000-0000-4000-8000-000000000001', email: 'userA@canopy.test', display_name: 'User A', created_at: new Date().toISOString() };
    userB = { id: '00000000-0000-4000-8000-000000000002', email: 'userB@canopy.test', display_name: 'User B', created_at: new Date().toISOString() };
    repo.users.set(userA.id, userA);
    repo.users.set(userB.id, userB);

    server = await buildServer({
      logger: false,
      repositories: { core: repo }
    });

    tokenA = issueAccessToken(userA);
    tokenB = issueAccessToken(userB);
  });

  after(async () => {
    if (server) await server.close();
  });

  it('rejects unauthenticated GET /v1/me/security with 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/v1/me/security'
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns truthful security status for authenticated User A', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/v1/me/security',
      headers: { authorization: `Bearer ${tokenA}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.data.account.email, 'userA@canopy.test');
    assert.equal(body.data.session.status, 'active');
    assert.equal(body.data.session.auth_method, 'jwt_bearer');
    assert.equal(body.data.two_factor.status, 'not_configured');
    assert.equal(body.data.two_factor.configured, false);
    assert.equal(body.data.oauth.status, 'not_configured');
    assert.deepEqual(body.data.oauth.providers, []);
    assert.equal(body.data.password.status, 'bcrypt_hashed');
  });

  it('enforces strict tenancy on PAT tokens and security state', async () => {
    // 1. User A creates a PAT machine token
    const createRes = await server.inject({
      method: 'POST',
      url: '/v1/me/tokens',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        name: 'MCP Dev Token A',
        scopes: ['projects:read', 'versions:read']
      }
    });

    assert.equal(createRes.statusCode, 201);
    const created = createRes.json();
    assert.ok(created.token); // Raw secret returned only on creation
    assert.ok(created.token.startsWith('cnp_pat_'));
    const tokenAId = created.id;

    // 2. User A lists tokens — raw secret must NOT be returned
    const listResA = await server.inject({
      method: 'GET',
      url: '/v1/me/tokens',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(listResA.statusCode, 200);
    const listA = listResA.json().data;
    assert.equal(listA.length, 1);
    assert.equal(listA[0].id, tokenAId);
    assert.equal(listA[0].token, undefined); // Token secret absent
    assert.equal(listA[0].token_hash, undefined); // Token hash absent

    // 3. User B lists tokens — User B must see 0 tokens
    const listResB = await server.inject({
      method: 'GET',
      url: '/v1/me/tokens',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(listResB.statusCode, 200);
    assert.equal(listResB.json().data.length, 0);

    // 4. User B attempts to revoke User A's token — must fail
    const revokeResB = await server.inject({
      method: 'DELETE',
      url: `/v1/me/tokens/${tokenAId}`,
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(revokeResB.statusCode, 404);

    // 5. User A revokes their own token — must succeed
    const revokeResA = await server.inject({
      method: 'DELETE',
      url: `/v1/me/tokens/${tokenAId}`,
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(revokeResA.statusCode, 200);

    // 6. Security status for User A reflects updated active token count
    const secResA = await server.inject({
      method: 'GET',
      url: '/v1/me/security',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(secResA.statusCode, 200);
    assert.equal(secResA.json().data.api_tokens.active_count, 0);
    assert.equal(secResA.json().data.api_tokens.total_count, 1);
  });
});
