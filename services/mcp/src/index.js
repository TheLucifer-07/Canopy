import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CanopyApiClient } from '@canopy/api-client';
import { PLATFORM_NAME, PLATFORM_VERSION } from '@canopy/config';

const DEFAULT_API_URL = process.env.CANOPY_API_URL || 'http://localhost:3000/v1';
const DEFAULT_TOKEN = process.env.CANOPY_MCP_TOKEN || '';
const rateBuckets = new Map();

export function createCanopyMcpServer({ apiUrl = DEFAULT_API_URL, token = DEFAULT_TOKEN, logger = console.error } = {}) {
  const server = new McpServer({ name: 'canopy-mcp', version: PLATFORM_VERSION });
  const api = new CanopyApiClient({ baseUrl: apiUrl, token });

  registerReadTool(server, logger, token, 'canopy_list_projects', {
    title: 'List Canopy projects',
    description: 'List projects visible to the authenticated Canopy token.',
    inputSchema: {}
  }, async () => api.listProjects());

  registerReadTool(server, logger, token, 'canopy_get_project', {
    title: 'Get Canopy project',
    description: 'Get one project and lightweight project metadata.',
    inputSchema: { project_id: z.string().uuid() }
  }, async ({ project_id }) => {
    const [project, lineage, memories] = await Promise.all([
      api.getProject(project_id),
      api.getLineage(project_id),
      api.listMemories(project_id).catch(() => ({ data: [] }))
    ]);
    return {
      project,
      metadata: {
        goal: project.creative_goal || null,
        version_count: lineage.versions.length,
        memory_count: memories.data?.length || 0,
        tip_versions: lineage.tips
      }
    };
  });

  registerReadTool(server, logger, token, 'canopy_get_lineage', {
    title: 'Get Canopy lineage',
    description: 'Get authorized version lineage with parent edges, branch points, and merge relationships.',
    inputSchema: { project_id: z.string().uuid() }
  }, async ({ project_id }) => {
    const lineage = await api.getLineage(project_id);
    return {
      ...lineage,
      versions: lineage.versions.slice(0, 2000),
      node_limit: 2000,
      truncated: lineage.versions.length > 2000,
      merge_relationships: lineage.edges.filter((edge) => edge.role === 'merge_source')
    };
  });

  registerReadTool(server, logger, token, 'canopy_get_version', {
    title: 'Get Canopy version',
    description: 'Get an authorized version, action, provenance, parents, and signed asset URL when available.',
    inputSchema: { version_id: z.string().uuid() }
  }, async ({ version_id }) => {
    const version = await api.getVersion(version_id);
    const asset_url = version.asset_id ? await api.getAssetUrl(version.asset_id).catch(() => null) : null;
    return { version, asset_url };
  });

  registerReadTool(server, logger, token, 'canopy_compare_versions', {
    title: 'Compare Canopy versions',
    description: 'Run the existing Canopy Semantic Diff endpoint. Expected latency can be several seconds when visual AI is used.',
    inputSchema: { from_id: z.string().uuid(), to_id: z.string().uuid() }
  }, async ({ from_id, to_id }) => api.createDiff({ from_version_id: from_id, to_version_id: to_id }), { limit: 10 });

  registerReadTool(server, logger, token, 'canopy_search_history', {
    title: 'Search Canopy history',
    description: 'Search authorized project history through the Canopy API retrieval path.',
    inputSchema: { project_id: z.string().uuid(), query: z.string().min(1).max(500) }
  }, async ({ project_id, query }) => api.searchHistory(project_id, { query }));

  registerReadTool(server, logger, token, 'canopy_get_memory', {
    title: 'Get Canopy memory',
    description: 'List active Creative Memories for an authorized project.',
    inputSchema: { project_id: z.string().uuid(), type: z.string().optional() }
  }, async ({ project_id, type }) => api.listMemories(project_id, { type }));

  return server;
}

function registerReadTool(server, logger, token, name, config, handler, rate = { limit: 60 }) {
  server.registerTool(name, config, async (input) => {
    const startedAt = Date.now();
    const projectId = input?.project_id || null;
    try {
      checkRateLimit(token, name, rate.limit);
      const result = await handler(input || {});
      logger(JSON.stringify({ event: 'mcp.tool_call', token_id: token ? token.slice(0, 16) : 'missing', tool: name, project_id: projectId, latency_ms: Date.now() - startedAt, outcome: 'ok' }));
      return jsonContent(result);
    } catch (error) {
      logger(JSON.stringify({ event: 'mcp.tool_call', token_id: token ? token.slice(0, 16) : 'missing', tool: name, project_id: projectId, latency_ms: Date.now() - startedAt, outcome: 'error', code: error.error?.code || error.code || 'MCP_TOOL_FAILED' }));
      return jsonContent({
        error: {
          code: error.error?.code || error.code || 'MCP_TOOL_FAILED',
          message: error.error?.message || error.message || 'Canopy MCP tool failed.'
        }
      }, true);
    }
  });
}

function jsonContent(value, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
    isError
  };
}

function checkRateLimit(token, name, limit) {
  const now = Date.now();
  const key = `${token || 'missing'}:${name}:${limit}`;
  const windowStart = now - 60_000;
  const timestamps = (rateBuckets.get(key) || []).filter((timestamp) => timestamp > windowStart);
  if (timestamps.length >= limit) {
    const error = new Error('MCP rate limit exceeded.');
    error.code = 'MCP_RATE_LIMITED';
    throw error;
  }
  timestamps.push(now);
  rateBuckets.set(key, timestamps);
}

export async function start() {
  if (!DEFAULT_TOKEN) {
    console.error(`${PLATFORM_NAME} MCP requires CANOPY_MCP_TOKEN.`);
    process.exit(1);
  }
  const server = createCanopyMcpServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((error) => {
    console.error(JSON.stringify({ event: 'mcp.start_failed', code: error.code || 'MCP_START_FAILED', message: error.message }));
    process.exit(1);
  });
}
