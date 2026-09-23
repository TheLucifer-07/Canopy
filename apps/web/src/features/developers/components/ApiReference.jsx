import React, { useState } from 'react';
import {
  Code2, Key, Search, ChevronRight, Lock, Globe, Layers, ArrowUpRight
} from 'lucide-react';
import { Badge, Input, cn } from '@canopy/ui';

const API_ENDPOINTS = [
  {
    category: 'Authentication & Tokens',
    method: 'GET',
    path: '/v1/me/tokens',
    desc: 'List active and revoked Personal Access Tokens for authenticated user.',
    auth: 'Bearer Token / PAT',
    response: '{ data: Array<ApiToken> }'
  },
  {
    category: 'Authentication & Tokens',
    method: 'POST',
    path: '/v1/me/tokens',
    desc: 'Generate a new Personal Access Token with scoped permissions (raw token returned once).',
    auth: 'Bearer Token',
    body: '{ name: string, scopes: Array<string> }',
    response: '{ id, name, token_prefix, scopes, created_at, token }'
  },
  {
    category: 'Authentication & Tokens',
    method: 'DELETE',
    path: '/v1/me/tokens/:tokenId',
    desc: 'Revoke a Personal Access Token.',
    auth: 'Bearer Token',
    response: '{ id, name, token_prefix, revoked_at }'
  },
  {
    category: 'Projects',
    method: 'GET',
    path: '/v1/projects',
    desc: 'List creative projects owned by the authenticated principal.',
    auth: 'Bearer Token / PAT',
    response: '{ data: Array<Project> }'
  },
  {
    category: 'Projects',
    method: 'POST',
    path: '/v1/projects',
    desc: 'Create a new creative project with a creative goal.',
    auth: 'Bearer Token',
    body: '{ name: string, creative_goal?: string }',
    response: '{ id, name, creative_goal, created_at }'
  },
  {
    category: 'Projects',
    method: 'GET',
    path: '/v1/projects/:projectId',
    desc: 'Retrieve details of an authorized creative project.',
    auth: 'Bearer Token / PAT',
    response: '{ id, name, creative_goal, created_at, updated_at }'
  },
  {
    category: 'Projects',
    method: 'GET',
    path: '/v1/projects/:projectId/lineage',
    desc: 'Retrieve the complete creative lineage DAG including nodes, parent edges, branch points, and merge vertices.',
    auth: 'Bearer Token / PAT',
    response: '{ versions, edges, branch_points, tips, roots }'
  },
  {
    category: 'Versions',
    method: 'GET',
    path: '/v1/projects/:projectId/versions',
    desc: 'List ordered versions for a project.',
    auth: 'Bearer Token / PAT',
    response: '{ data: Array<Version> }'
  },
  {
    category: 'Versions',
    method: 'GET',
    path: '/v1/versions/:versionId',
    desc: 'Retrieve a single version record with action metadata and provenance.',
    auth: 'Bearer Token / PAT',
    response: '{ id, project_id, sequence, action, actor_type, created_at }'
  },
  {
    category: 'Assets',
    method: 'GET',
    path: '/v1/projects/:projectId/assets',
    desc: 'List creative assets attached to a project.',
    auth: 'Bearer Token / PAT',
    response: '{ data: Array<Asset> }'
  },
  {
    category: 'Assets',
    method: 'GET',
    path: '/v1/assets/:assetId/url',
    desc: 'Get temporary signed access URL for an authorized asset.',
    auth: 'Bearer Token / PAT',
    response: '{ url: string }'
  },
  {
    category: 'Semantic Diff',
    method: 'POST',
    path: '/v1/diffs',
    desc: 'Compare two versions across Declared Delta, Path Summary, and Observed Delta facets.',
    auth: 'Bearer Token / PAT',
    body: '{ from_version_id: UUID, to_version_id: UUID }',
    response: '{ status, path, summary, facets, discrepancies, confidence }'
  },
  {
    category: 'Creative Memory',
    method: 'GET',
    path: '/v1/projects/:projectId/memories',
    desc: 'List active, confirmed Creative Memories for a project.',
    auth: 'Bearer Token / PAT',
    response: '{ data: Array<Memory> }'
  },
  {
    category: 'Creative Memory',
    method: 'POST',
    path: '/v1/projects/:projectId/memories',
    desc: 'Create a user-authored Creative Memory.',
    auth: 'Bearer Token',
    body: '{ type: string, statement: string, rationale?: string }',
    response: '{ id, type, statement, status: "active" }'
  },
  {
    category: 'Copilot',
    method: 'POST',
    path: '/v1/projects/:projectId/copilot/messages',
    desc: 'Stream a grounded AI answer for a question regarding project lineage and memory (Server-Sent Events).',
    auth: 'Bearer Token / PAT',
    body: '{ question: string, conversation_id?: UUID }',
    response: 'text/event-stream (events: plan, token, answer, error)'
  }
];

export function ApiReference() {
  const [search, setSearch] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(API_ENDPOINTS[0]);

  const filtered = API_ENDPOINTS.filter((ep) => {
    const q = search.toLowerCase();
    return (
      ep.path.toLowerCase().includes(q) ||
      ep.desc.toLowerCase().includes(q) ||
      ep.category.toLowerCase().includes(q) ||
      ep.method.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-lg border border-canopy-border bg-canopy-surface/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-white">Base API Endpoint: </span>
          <span className="font-mono text-canopy-green">http://localhost:3000/v1</span>
        </div>
        <div className="flex items-center gap-2 text-canopy-muted">
          <Lock className="h-3.5 w-3.5 text-canopy-green" />
          <span>Requires `Authorization: Bearer cnp_pat_...`</span>
        </div>
      </div>

      {/* Filter and Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Endpoints List */}
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
            <Input
              placeholder="Filter API endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="space-y-2 mt-4">
            {filtered.map((ep) => {
              const isSelected = selectedEndpoint?.path === ep.path && selectedEndpoint?.method === ep.method;
              return (
                <div
                  key={`${ep.method}-${ep.path}`}
                  onClick={() => setSelectedEndpoint(ep)}
                  className={cn(
                    'cursor-pointer rounded-lg border p-3.5 transition text-xs flex items-center justify-between gap-3',
                    isSelected
                      ? 'border-canopy-green bg-canopy-surface shadow-md'
                      : 'border-canopy-border bg-canopy-surface/50 hover:border-canopy-green/50 hover:bg-canopy-surface'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 font-mono text-[10px] font-bold',
                        ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                        ep.method === 'POST' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                        ep.method === 'PATCH' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      )}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-white truncate">{ep.path}</span>
                    <span className="hidden md:inline text-canopy-muted truncate">{ep.desc}</span>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 shrink-0 transition', isSelected ? 'text-canopy-green' : 'text-canopy-muted')} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Endpoint Inspector */}
        {selectedEndpoint && (
          <aside className="rounded-lg border border-canopy-border bg-canopy-surface p-5 space-y-4 sticky top-20 h-fit">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-canopy-green">{selectedEndpoint.category}</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'rounded px-2 py-0.5 font-mono text-xs font-bold',
                    selectedEndpoint.method === 'GET' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                    selectedEndpoint.method === 'POST' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                    selectedEndpoint.method === 'PATCH' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                    'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  )}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{selectedEndpoint.path}</span>
              </div>
            </div>

            <p className="text-xs text-canopy-secondary leading-relaxed border-t border-canopy-border pt-3">
              {selectedEndpoint.desc}
            </p>

            <div className="space-y-1.5 border-t border-canopy-border pt-3 text-xs">
              <span className="font-semibold text-canopy-muted uppercase tracking-wider text-[10px]">Authentication</span>
              <div className="font-mono text-canopy-secondary">{selectedEndpoint.auth}</div>
            </div>

            {selectedEndpoint.body && (
              <div className="space-y-1.5 border-t border-canopy-border pt-3 text-xs">
                <span className="font-semibold text-canopy-muted uppercase tracking-wider text-[10px]">Request Body</span>
                <div className="rounded border border-canopy-border bg-canopy-bg p-2.5 font-mono text-[11px] text-canopy-secondary">
                  {selectedEndpoint.body}
                </div>
              </div>
            )}

            <div className="space-y-1.5 border-t border-canopy-border pt-3 text-xs">
              <span className="font-semibold text-canopy-muted uppercase tracking-wider text-[10px]">Response Shape</span>
              <div className="rounded border border-canopy-border bg-canopy-bg p-2.5 font-mono text-[11px] text-emerald-400/90 overflow-x-auto">
                {selectedEndpoint.response}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
