import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CanopyApiClient } from '../../packages/api-client/src/index.js';

describe('Phase 9 API client copilot contract', () => {
  it('calls listCopilotConversations and getCopilotConversation with proper routes and auth', async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      if (url.includes('/projects/proj-1/copilot/conversations')) {
        return new Response(JSON.stringify({
          data: [{ id: 'conv-1', title: 'Background change rationale' }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('/copilot/conversations/conv-1')) {
        return new Response(JSON.stringify({
          id: 'conv-1',
          title: 'Background change rationale',
          messages: [{ id: 'msg-1', role: 'user', content: 'Why did the background change in V2?' }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new CanopyApiClient({ baseUrl: 'http://api.test/v1', token: 'pat-token' });
    const list = await client.listCopilotConversations('proj-1');
    const conv = await client.getCopilotConversation('conv-1');

    assert.equal(calls[0].url, 'http://api.test/v1/projects/proj-1/copilot/conversations');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer pat-token');
    assert.equal(calls[1].url, 'http://api.test/v1/copilot/conversations/conv-1');
    assert.equal(calls[1].options.headers.Authorization, 'Bearer pat-token');
    assert.equal(list.data[0].id, 'conv-1');
    assert.equal(conv.id, 'conv-1');
    assert.equal(conv.messages[0].id, 'msg-1');
    mock.restoreAll();
  });
});
