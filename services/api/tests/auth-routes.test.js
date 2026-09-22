import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';

function createAuthRepository() {
  const users = [];
  return {
    pool: {
      async query(sql, args) {
        if (sql.includes('INSERT INTO users')) {
          const row = {
            id: '00000000-0000-4000-8000-000000000101',
            email: String(args[0]).toLowerCase(),
            password_hash: args[1],
            display_name: args[2]
          };
          users.push(row);
          return { rows: [{ id: row.id, email: row.email, display_name: row.display_name }] };
        }
        if (sql.includes('SELECT id,email,display_name,password_hash FROM users')) {
          return { rows: users.filter((user) => user.email === String(args[0]).toLowerCase()) };
        }
        if (sql.includes('SELECT id,email FROM users')) {
          return { rows: users.filter((user) => user.id === args[0]).map(({ id, email }) => ({ id, email })) };
        }
        return { rows: [] };
      }
    }
  };
}

async function withServer(testFn) {
  const server = await buildServer({
    logger: false,
    repositories: { core: createAuthRepository() }
  });
  try {
    await testFn(server);
  } finally {
    await server.close();
  }
}

describe('Phase 2 auth routes', () => {
  it('registers, logs in, and rejects invalid credentials', async () => {
    await withServer(async (server) => {
      const register = await server.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'Creator@Example.test', password: 'canopy-demo-pass', display_name: 'Creator' }
      });
      assert.equal(register.statusCode, 201);
      const registered = register.json();
      assert.equal(registered.user.email, 'creator@example.test');
      assert.equal(registered.user.display_name, 'Creator');
      assert.ok(registered.access_token);

      const login = await server.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'creator@example.test', password: 'canopy-demo-pass' }
      });
      assert.equal(login.statusCode, 200);
      assert.equal(login.json().user.email, 'creator@example.test');
      assert.ok(login.json().access_token);

      const failed = await server.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'creator@example.test', password: 'wrong-password' }
      });
      assert.equal(failed.statusCode, 401);
      assert.equal(failed.json().error.message, 'Invalid email or password.');
    });
  });
});
