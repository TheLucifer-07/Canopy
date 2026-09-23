import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';
import { issueAccessToken } from '../src/lib/auth.js';

const USER_A = '00000000-0000-4000-8000-000000000001';
const USER_B = '00000000-0000-4000-8000-000000000002';

function createFakeProfileRepository() {
  const profiles = new Map([
    [USER_A, {
      id: USER_A,
      email: 'user_a@canopy.design',
      display_name: 'User A',
      username: 'user_a',
      bio: 'Design lead',
      location: 'Tokyo',
      website: 'https://a.design',
      avatar_url: null,
      preferences: { diff_detail_level: 'standard' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }],
    [USER_B, {
      id: USER_B,
      email: 'user_b@canopy.design',
      display_name: 'User B',
      username: 'user_b',
      bio: 'Motion designer',
      location: 'Berlin',
      website: 'https://b.design',
      avatar_url: null,
      preferences: { diff_detail_level: 'compact' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  ]);

  const activities = new Map([
    [USER_A, [{ id: 'act-a1', action: 'Created creative version V1', project_name: 'Campaign A', timestamp: new Date().toISOString() }]],
    [USER_B, [{ id: 'act-b1', action: 'Imported project asset', project_name: 'Campaign B', timestamp: new Date().toISOString() }]]
  ]);

  return {
    pool: {
      async query(sql, params) {
        if (sql.includes('FROM users WHERE id=$1')) {
          const uid = params[0];
          return { rows: [{ id: uid, email: uid === USER_A ? 'user_a@canopy.design' : 'user_b@canopy.design' }] };
        }
        return { rows: [] };
      }
    },
    async getUserProfile({ userId }) {
      return profiles.get(userId) || null;
    },
    async updateUserProfile({ userId, input }) {
      const current = profiles.get(userId) || {};
      const updated = {
        ...current,
        display_name: input.display_name !== undefined ? input.display_name : current.display_name,
        username: input.username !== undefined ? input.username : current.username,
        bio: input.bio !== undefined ? input.bio : current.bio,
        location: input.location !== undefined ? input.location : current.location,
        website: input.website !== undefined ? input.website : current.website,
        avatar_url: input.avatar_url !== undefined ? input.avatar_url : current.avatar_url,
        preferences: { ...(current.preferences || {}), ...(input.preferences || {}) },
        updated_at: new Date().toISOString()
      };
      profiles.set(userId, updated);
      return updated;
    },
    async getUserActivity({ userId, limit = 20 }) {
      return (activities.get(userId) || []).slice(0, limit);
    }
  };
}

describe('Phase 11 Profile & Activity Routes & Ownership Isolation', () => {
  it('handles GET and PATCH /v1/me/profile and enforces strict user isolation', async () => {
    const fakeRepo = createFakeProfileRepository();
    const app = await buildServer({
      logger: false,
      repositories: {
        core: fakeRepo
      }
    });

    const tokenA = issueAccessToken({ id: USER_A, email: 'user_a@canopy.design' });
    const tokenB = issueAccessToken({ id: USER_B, email: 'user_b@canopy.design' });

    // 1. User A reads own profile
    const resA = await app.inject({
      method: 'GET',
      url: '/v1/me/profile',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(resA.statusCode, 200);
    const profileA = JSON.parse(resA.body);
    assert.equal(profileA.id, USER_A);
    assert.equal(profileA.display_name, 'User A');
    assert.equal(profileA.username, 'user_a');

    // 2. User B reads own profile and does not see User A's data
    const resB = await app.inject({
      method: 'GET',
      url: '/v1/me/profile',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(resB.statusCode, 200);
    const profileB = JSON.parse(resB.body);
    assert.equal(profileB.id, USER_B);
    assert.equal(profileB.display_name, 'User B');
    assert.notEqual(profileB.id, profileA.id);

    // 3. User A updates profile
    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/v1/me/profile',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        display_name: 'Alex Mercer Updated',
        bio: 'Principal Creative Technologist',
        preferences: { diff_detail_level: 'deep', copilot_groundedness: 'strict' }
      })
    });
    assert.equal(updateRes.statusCode, 200);
    const updatedA = JSON.parse(updateRes.body);
    assert.equal(updatedA.display_name, 'Alex Mercer Updated');
    assert.equal(updatedA.bio, 'Principal Creative Technologist');
    assert.equal(updatedA.preferences.diff_detail_level, 'deep');

    // 4. User B remains unaffected
    const checkB = await app.inject({
      method: 'GET',
      url: '/v1/me/profile',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(JSON.parse(checkB.body).display_name, 'User B');

    // 5. User Activity Isolation
    const actResA = await app.inject({
      method: 'GET',
      url: '/v1/me/activity',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(actResA.statusCode, 200);
    const actA = JSON.parse(actResA.body);
    assert.equal(actA.data[0].project_name, 'Campaign A');

    const actResB = await app.inject({
      method: 'GET',
      url: '/v1/me/activity',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(actResB.statusCode, 200);
    const actB = JSON.parse(actResB.body);
    assert.equal(actB.data[0].project_name, 'Campaign B');

    await app.close();
  });
});
