import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const token = 'test-read-only-token';
const projectId = '00000000-0000-4000-8000-000000000010';
const versionId = '00000000-0000-4000-8000-000000000032';
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fixtureServer() {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, auth: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401).end(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token.' } }));
      return;
    }
    if (req.url === '/v1/projects') return res.end(JSON.stringify({ data: [{ id: projectId, name: 'Launch', creative_goal: 'Ship', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] }));
    if (req.url === `/v1/projects/${projectId}`) return res.end(JSON.stringify({ id: projectId, name: 'Launch', creative_goal: 'Ship' }));
    if (req.url === `/v1/projects/${projectId}/lineage`) return res.end(JSON.stringify({ versions: [{ id: versionId, project_id: projectId, sequence: 2 }], edges: [], branch_points: [], tips: [versionId], roots: [versionId] }));
    if (req.url === `/v1/versions/${versionId}`) return res.end(JSON.stringify({ id: versionId, project_id: projectId, asset_id: null, sequence: 2, action: { type: 'commit' }, parents: [] }));
    if (req.url === `/v1/projects/${projectId}/memories`) return res.end(JSON.stringify({ data: [{ id: '00000000-0000-4000-8000-000000000050', project_id: projectId, type: 'preference', statement: 'Use Luma.' }] }));
    if (req.url?.startsWith(`/v1/projects/${projectId}/history/search`)) return res.end(JSON.stringify({ data: { versions: [{ id: versionId }], memories: [] } }));
    if (req.url === '/v1/diffs' && req.method === 'POST') return res.end(JSON.stringify({ status: 'declared_only', from_version_id: versionId, to_version_id: versionId }));
    res.writeHead(404).end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));
  });
  return { server, requests };
}

describe('Phase 5 MCP server', () => {
  it('starts with the official SDK, lists tools, and calls Canopy through HTTP', async () => {
    const { server, requests } = fixtureServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    const client = new Client({ name: 'canopy-mcp-test', version: '0.1.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['src/index.js'],
      cwd: packageRoot,
      env: { ...process.env, CANOPY_API_URL: `http://127.0.0.1:${port}/v1`, CANOPY_MCP_TOKEN: token },
      stderr: 'pipe'
    });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      const names = tools.tools.map((tool) => tool.name).sort();
      assert.deepEqual(names, [
        'canopy_compare_versions',
        'canopy_get_lineage',
        'canopy_get_memory',
        'canopy_get_project',
        'canopy_get_version',
        'canopy_list_projects',
        'canopy_search_history'
      ]);
      const result = await client.callTool({ name: 'canopy_get_project', arguments: { project_id: projectId } });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.project.id, projectId);
      assert.equal(data.metadata.version_count, 1);
      assert.ok(requests.every((request) => request.auth === `Bearer ${token}`));
    } finally {
      await client.close().catch(() => {});
      server.close();
    }
  });
});
