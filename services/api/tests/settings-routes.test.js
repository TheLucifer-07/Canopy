import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';
import { issueAccessToken } from '../src/lib/auth.js';

const USER_A = '00000000-0000-4000-8000-000000000001';
const USER_B = '00000000-0000-4000-8000-000000000002';

function createFakeSettingsRepository() {
  const settingsStore = new Map([
    [USER_A, {
      account: { id: USER_A, email: 'user_a@canopy.design', display_name: 'User A', username: 'user_a', created_at: new Date().toISOString(), status: 'active' },
      appearance: { theme: 'dark', density: 'comfortable', reduced_motion: false },
      preferences: { default_landing: 'dashboard', default_asset_view: 'side-by-side', notifications_enabled: true, activity_stream_density: 'standard' },
      security: { session_type: 'jwt_bearer', session_ttl_seconds: 604800, two_factor_status: 'not_configured', password_set: true },
      ai: { diff_detail_level: 'standard', copilot_groundedness: 'strict', enable_ai_suggestions: true, active_providers: ['gemini', 'groq'] },
      connected_services: [{ id: 'mcp', status: 'ready', version: '0.1.0' }]
    }],
    [USER_B, {
      account: { id: USER_B, email: 'user_b@canopy.design', display_name: 'User B', username: 'user_b', created_at: new Date().toISOString(), status: 'active' },
      appearance: { theme: 'system', density: 'compact', reduced_motion: true },
      preferences: { default_landing: 'projects', default_asset_view: 'split-slider', notifications_enabled: false, activity_stream_density: 'compact' },
      security: { session_type: 'jwt_bearer', session_ttl_seconds: 604800, two_factor_status: 'not_configured', password_set: true },
      ai: { diff_detail_level: 'deep', copilot_groundedness: 'balanced', enable_ai_suggestions: false, active_providers: ['gemini', 'groq'] },
      connected_services: [{ id: 'mcp', status: 'ready', version: '0.1.0' }]
    }]
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
    async getUserSettings({ userId }) {
      return settingsStore.get(userId) || null;
    },
    async updateUserSettings({ userId, input }) {
      const current = settingsStore.get(userId) || {};
      const updated = {
        ...current,
        appearance: { ...(current.appearance || {}), ...(input.appearance || {}) },
        preferences: { ...(current.preferences || {}), ...(input.preferences || {}) },
        ai: { ...(current.ai || {}), ...(input.ai || {}) }
      };
      settingsStore.set(userId, updated);
      return updated;
    }
  };
}

describe('Phase 13 Settings Routes & Tenancy Isolation', () => {
  it('handles GET and PATCH /v1/me/settings and strictly isolates user settings', async () => {
    const fakeRepo = createFakeSettingsRepository();
    const app = await buildServer({
      logger: false,
      repositories: { core: fakeRepo }
    });

    const tokenA = issueAccessToken({ id: USER_A, email: 'user_a@canopy.design' });
    const tokenB = issueAccessToken({ id: USER_B, email: 'user_b@canopy.design' });

    // 1. User A retrieves settings
    const resA = await app.inject({
      method: 'GET',
      url: '/v1/me/settings',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(resA.statusCode, 200);
    const dataA = JSON.parse(resA.body);
    assert.equal(dataA.account.email, 'user_a@canopy.design');
    assert.equal(dataA.appearance.theme, 'dark');
    assert.equal(dataA.appearance.density, 'comfortable');
    assert.equal(dataA.ai.diff_detail_level, 'standard');
    // Ensure no secrets leaked
    assert.equal(dataA.gemini_api_key, undefined);
    assert.equal(dataA.groq_api_key, undefined);
    assert.equal(dataA.database_url, undefined);

    // 2. User B retrieves settings - isolated from User A
    const resB = await app.inject({
      method: 'GET',
      url: '/v1/me/settings',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(resB.statusCode, 200);
    const dataB = JSON.parse(resB.body);
    assert.equal(dataB.account.email, 'user_b@canopy.design');
    assert.equal(dataB.appearance.theme, 'system');
    assert.equal(dataB.appearance.density, 'compact');

    // 3. User A updates appearance and AI preferences
    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/v1/me/settings',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        appearance: { density: 'compact', reduced_motion: true },
        preferences: { default_landing: 'saved-items' },
        ai: { diff_detail_level: 'deep', copilot_groundedness: 'balanced' }
      })
    });
    assert.equal(updateRes.statusCode, 200);
    const updatedA = JSON.parse(updateRes.body);
    assert.equal(updatedA.appearance.density, 'compact');
    assert.equal(updatedA.appearance.reduced_motion, true);
    assert.equal(updatedA.preferences.default_landing, 'saved-items');
    assert.equal(updatedA.ai.diff_detail_level, 'deep');

    // 4. User B remains completely untouched
    const checkB = await app.inject({
      method: 'GET',
      url: '/v1/me/settings',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(JSON.parse(checkB.body).preferences.default_landing, 'projects');

    await app.close();
  });
});
