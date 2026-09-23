import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';
import { issueAccessToken } from '../src/lib/auth.js';

const USER_A = '00000000-0000-4000-8000-000000000001';
const USER_B = '00000000-0000-4000-8000-000000000002';
const PROJ_A = '00000000-0000-4000-8000-000000000010';
const PROJ_B = '00000000-0000-4000-8000-000000000020';

function createFakeUserSystemRepository() {
  const notifications = [
    {
      id: '00000000-0000-4000-8000-000000000101',
      user_id: USER_A,
      type: 'project_activity',
      title: 'Created project Campaign A',
      message: 'New creative workspace initialized',
      entity_type: 'project',
      entity_id: PROJ_A,
      read_at: null,
      created_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-4000-8000-000000000102',
      user_id: USER_B,
      type: 'project_activity',
      title: 'Created project Campaign B',
      message: 'New creative workspace initialized',
      entity_type: 'project',
      entity_id: PROJ_B,
      read_at: null,
      created_at: new Date().toISOString()
    }
  ];

  const savedItems = [
    {
      id: '00000000-0000-4000-8000-000000000201',
      user_id: USER_A,
      entity_type: 'project',
      entity_id: PROJ_A,
      metadata: { name: 'Campaign A' },
      created_at: new Date().toISOString()
    }
  ];

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
    async listNotifications({ userId, limit = 50, unreadOnly = false }) {
      return notifications.filter((n) => n.user_id === userId && (!unreadOnly || !n.read_at)).slice(0, limit);
    },
    async getUnreadNotificationCount({ userId }) {
      return notifications.filter((n) => n.user_id === userId && !n.read_at).length;
    },
    async markNotificationRead({ userId, notificationId }) {
      const n = notifications.find((candidate) => candidate.id === notificationId && candidate.user_id === userId);
      if (!n) {
        const error = new Error('Notification not found.');
        error.code = 'NOTIFICATION_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      n.read_at = new Date().toISOString();
      return n;
    },
    async markAllNotificationsRead({ userId }) {
      notifications.filter((n) => n.user_id === userId).forEach((n) => { n.read_at = new Date().toISOString(); });
      return { success: true };
    },
    async listSavedItems({ userId, limit = 50, entityType = null }) {
      return savedItems.filter((s) => s.user_id === userId && (!entityType || s.entity_type === entityType)).slice(0, limit);
    },
    async saveItem({ userId, entityType, entityId, metadata = {} }) {
      if (entityType === 'project' && entityId === PROJ_B && userId === USER_A) {
        const err = new Error('Cannot save project: not found or unauthorized.');
        err.code = 'PROJECT_NOT_FOUND';
        err.statusCode = 404;
        throw err;
      }
      const existing = savedItems.find((s) => s.user_id === userId && s.entity_type === entityType && s.entity_id === entityId);
      if (existing) return existing;
      const row = {
        id: `00000000-0000-4000-8000-000000000${200 + savedItems.length + 1}`,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        created_at: new Date().toISOString()
      };
      savedItems.push(row);
      return row;
    },
    async unsaveItem({ userId, savedItemId }) {
      const idx = savedItems.findIndex((s) => (s.id === savedItemId || s.entity_id === savedItemId) && s.user_id === userId);
      if (idx === -1) {
        const err = new Error('Saved item not found.');
        err.code = 'SAVED_ITEM_NOT_FOUND';
        err.statusCode = 404;
        throw err;
      }
      const [removed] = savedItems.splice(idx, 1);
      return removed;
    }
  };
}

describe('Phase 12 User System Routes & Security Isolation', () => {
  it('enforces strict ownership on notifications and saved items', async () => {
    const fakeRepo = createFakeUserSystemRepository();
    const app = await buildServer({
      logger: false,
      repositories: {
        core: fakeRepo
      }
    });

    const tokenA = issueAccessToken({ id: USER_A, email: 'user_a@canopy.design' });
    const tokenB = issueAccessToken({ id: USER_B, email: 'user_b@canopy.design' });

    // 1. User A lists notifications
    const notifsA = await app.inject({
      method: 'GET',
      url: '/v1/me/notifications',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(notifsA.statusCode, 200);
    const dataA = JSON.parse(notifsA.body).data;
    assert.equal(dataA.length, 1);
    assert.equal(dataA[0].user_id, USER_A);

    // 2. User B does NOT see User A's notifications
    const notifsB = await app.inject({
      method: 'GET',
      url: '/v1/me/notifications',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(notifsB.statusCode, 200);
    const dataB = JSON.parse(notifsB.body).data;
    assert.equal(dataB.length, 1);
    assert.equal(dataB[0].user_id, USER_B);

    // 3. User A cannot mark User B's notification as read
    const hackRead = await app.inject({
      method: 'PATCH',
      url: `/v1/me/notifications/${dataB[0].id}/read`,
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(hackRead.statusCode, 404);

    // 4. User A marks own notification read
    const readA = await app.inject({
      method: 'PATCH',
      url: `/v1/me/notifications/${dataA[0].id}/read`,
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(readA.statusCode, 200);

    // 5. Unread count is now 0 for User A
    const countA = await app.inject({
      method: 'GET',
      url: '/v1/me/notifications/unread-count',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(JSON.parse(countA.body).unread_count, 0);

    // 6. User A cannot save User B's private project
    const hackSave = await app.inject({
      method: 'POST',
      url: '/v1/me/saved-items',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        entity_type: 'project',
        entity_id: PROJ_B
      })
    });
    assert.equal(hackSave.statusCode, 404);

    // 7. User A lists saved items
    const savedListA = await app.inject({
      method: 'GET',
      url: '/v1/me/saved-items',
      headers: { authorization: `Bearer ${tokenA}` }
    });
    assert.equal(savedListA.statusCode, 200);
    assert.equal(JSON.parse(savedListA.body).data.length, 1);

    // 8. User B does not see User A's saved items
    const savedListB = await app.inject({
      method: 'GET',
      url: '/v1/me/saved-items',
      headers: { authorization: `Bearer ${tokenB}` }
    });
    assert.equal(savedListB.statusCode, 200);
    assert.equal(JSON.parse(savedListB.body).data.length, 0);

    await app.close();
  });
});
