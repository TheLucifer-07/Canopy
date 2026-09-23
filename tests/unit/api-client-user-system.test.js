import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 12 API client user system contracts', () => {
  it('calls notifications endpoints', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.includes('/me/notifications/unread-count')) {
        return new Response(JSON.stringify({ unread_count: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/me/notifications/mark-all-read')) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/read') && options.method === 'PATCH') {
        return new Response(JSON.stringify({ id: 'notif-1', read_at: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/me/notifications')) {
        return new Response(JSON.stringify({ data: [{ id: 'notif-1', type: 'project_activity', title: 'Project created' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'test-token' });

    const notifs = await client.listNotifications({ limit: 10 });
    const count = await client.getUnreadNotificationCount();
    const read = await client.markNotificationRead('notif-1');
    const allRead = await client.markAllNotificationsRead();

    assert.equal(calls[0].url, 'http://api.test/v1/me/notifications?limit=10');
    assert.equal(calls[0].options.method || 'GET', 'GET');
    assert.equal(notifs.data.length, 1);

    assert.equal(calls[1].url, 'http://api.test/v1/me/notifications/unread-count');
    assert.equal(count.unread_count, 3);

    assert.equal(calls[2].url, 'http://api.test/v1/me/notifications/notif-1/read');
    assert.equal(calls[2].options.method, 'PATCH');
    assert.ok(read.read_at);

    assert.equal(calls[3].url, 'http://api.test/v1/me/notifications/mark-all-read');
    assert.equal(calls[3].options.method, 'POST');
    assert.equal(allRead.success, true);

    mock.restoreAll();
  });

  it('calls saved-items endpoints', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.includes('/me/saved-items') && options.method === 'POST') {
        return new Response(JSON.stringify({ id: 'save-1', entity_type: 'project', entity_id: 'proj-1' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/me/saved-items/save-1') && options.method === 'DELETE') {
        return new Response(JSON.stringify({ id: 'save-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/me/saved-items')) {
        return new Response(JSON.stringify({ data: [{ id: 'save-1', entity_type: 'project', entity_id: 'proj-1' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'test-token' });

    const items = await client.listSavedItems();
    const saved = await client.saveItem({ entity_type: 'project', entity_id: 'proj-1' });
    const unsaved = await client.unsaveItem('save-1');

    assert.equal(calls[0].url, 'http://api.test/v1/me/saved-items');
    assert.equal(items.data.length, 1);

    assert.equal(calls[1].url, 'http://api.test/v1/me/saved-items');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(saved.entity_id, 'proj-1');

    assert.equal(calls[2].url, 'http://api.test/v1/me/saved-items/save-1');
    assert.equal(calls[2].options.method, 'DELETE');
    assert.equal(unsaved.id, 'save-1');

    mock.restoreAll();
  });
});
