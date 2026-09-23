import React, { useState } from 'react';
import {
  Search, Shield, Code, Cpu, Layers, GitBranch, Split, Brain, Image as ImageIcon, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Badge, Input, cn } from '@canopy/ui';

export const MCP_TOOLS = [
  {
    name: 'canopy_list_projects',
    title: 'List Canopy Projects',
    category: 'Projects',
    access: 'Read',
    description: 'List all creative projects owned by the authenticated Canopy token principal.',
    rateLimit: '60/min',
    inputs: [],
    returns: {
      data: 'Array<{ id: string, name: string, creative_goal: string, created_at: string, updated_at: string }>'
    }
  },
  {
    name: 'canopy_get_project',
    title: 'Get Canopy Project',
    category: 'Projects',
    access: 'Read',
    description: 'Get project details, creative goal, lineage node count, active memory count, and branch tips.',
    rateLimit: '60/min',
    inputs: [
      { name: 'project_id', type: 'UUID', required: true, description: 'The unique ID of the creative project' }
    ],
    returns: {
      project: '{ id, name, creative_goal, created_at }',
      metadata: '{ goal, version_count, memory_count, tip_versions }'
    }
  },
  {
    name: 'canopy_list_versions',
    title: 'List Project Versions',
    category: 'Versions',
    access: 'Read',
    description: 'List ordered versions and actions for an authorized creative project.',
    rateLimit: '60/min',
    inputs: [
      { name: 'project_id', type: 'UUID', required: true, description: 'The unique ID of the creative project' }
    ],
    returns: {
      data: 'Array<{ id, sequence, action, actor_type, created_at }>'
    }
  },
  {
    name: 'canopy_get_version',
    title: 'Get Canopy Version',
    category: 'Versions',
    access: 'Read',
    description: 'Get a single version record, declared action, provenance, parent edges, and signed asset URL if available.',
    rateLimit: '60/min',
    inputs: [
      { name: 'version_id', type: 'UUID', required: true, description: 'The unique ID of the creative version' }
    ],
    returns: {
      version: '{ id, project_id, sequence, action, actor_type, parents }',
      asset_url: 'string (signed temporary URL) | null'
    }
  },
  {
    name: 'canopy_get_lineage',
    title: 'Get Canopy Lineage',
    category: 'Lineage',
    access: 'Read',
    description: 'Get the full version lineage DAG with parent-child edges, branch points, roots, and merge relationships.',
    rateLimit: '60/min',
    inputs: [
      { name: 'project_id', type: 'UUID', required: true, description: 'The unique ID of the creative project' }
    ],
    returns: {
      versions: 'Array<Version>',
      edges: 'Array<{ version_id, parent_version_id, role }>',
      branch_points: 'Array<UUID>',
      tips: 'Array<UUID>',
      roots: 'Array<UUID>'
    }
  },
  {
    name: 'canopy_get_asset',
    title: 'Get Canopy Asset',
    category: 'Assets',
    access: 'Read',
    description: 'Get asset metadata (dimensions, mime type, hash) and signed access URL for an authorized asset.',
    rateLimit: '60/min',
    inputs: [
      { name: 'asset_id', type: 'UUID', required: true, description: 'The unique ID of the creative asset' }
    ],
    returns: {
      asset: '{ id, project_id, mime_type, byte_size, width, height, hash }',
      asset_url: 'string (signed temporary URL)'
    }
  },
  {
    name: 'canopy_compare_versions',
    title: 'Compare Versions (Semantic Diff)',
    category: 'Diff',
    access: 'Read',
    description: 'Compute or retrieve the three-facet Semantic Diff (Declared Delta, Path Summary, and Observed Delta) between two versions.',
    rateLimit: '10/min',
    inputs: [
      { name: 'from_id', type: 'UUID', required: true, description: 'Base version ID' },
      { name: 'to_id', type: 'UUID', required: true, description: 'Target version ID' }
    ],
    returns: {
      status: "'ready' | 'declared_only' | 'fallback'",
      path: '{ summary, confidence }',
      facets: '{ composition, color, lighting, subject, style, typography, ... }',
      discrepancies: 'Array<string>'
    }
  },
  {
    name: 'canopy_search_history',
    title: 'Search Canopy History',
    category: 'Search',
    access: 'Read',
    description: 'Search project history, version actions, and confirmed creative memories using keyword & semantic retrieval.',
    rateLimit: '60/min',
    inputs: [
      { name: 'project_id', type: 'UUID', required: true, description: 'Project ID to search within' },
      { name: 'query', type: 'string', required: true, description: 'Search term (1-500 chars)' }
    ],
    returns: {
      data: '{ versions: Array<Version>, memories: Array<Memory> }'
    }
  },
  {
    name: 'canopy_get_memory',
    title: 'Get Creative Memory',
    category: 'Memory',
    access: 'Read',
    description: 'Retrieve active, confirmed Creative Memories (decisions, constraints, preferences, insights) for a project.',
    rateLimit: '60/min',
    inputs: [
      { name: 'project_id', type: 'UUID', required: true, description: 'The project ID' },
      { name: 'type', type: 'string', required: false, description: 'Optional memory type filter (decision, constraint, preference, learning)' }
    ],
    returns: {
      data: 'Array<{ id, project_id, type, statement, rationale, status: "active", created_at }>'
    }
  }
];

export function McpToolsList() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTool, setActiveTool] = useState(MCP_TOOLS[0]);

  const categories = ['All', 'Projects', 'Versions', 'Lineage', 'Assets', 'Diff', 'Memory', 'Search'];

  const filtered = MCP_TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.title.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
          <Input
            placeholder="Search MCP tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded px-2.5 py-1 text-xs transition',
                selectedCategory === cat
                  ? 'bg-canopy-green/15 text-canopy-green border border-canopy-green/40 font-medium'
                  : 'bg-canopy-surface text-canopy-secondary border border-canopy-border hover:text-white'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Tool List on Left, Selected Tool Inspector on Right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Tools List */}
        <div className="space-y-3">
          {filtered.map((tool) => {
            const isSelected = activeTool?.name === tool.name;
            return (
              <div
                key={tool.name}
                onClick={() => setActiveTool(tool)}
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition',
                  isSelected
                    ? 'border-canopy-green bg-canopy-surface shadow-md'
                    : 'border-canopy-border bg-canopy-surface/50 hover:border-canopy-green/50 hover:bg-canopy-surface'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white">{tool.name}</span>
                      <Badge variant="default" className="text-[10px] text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                        {tool.access}
                      </Badge>
                      <Badge variant="default" className="text-[10px] text-canopy-muted">
                        {tool.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-canopy-secondary leading-relaxed">{tool.description}</p>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 shrink-0 transition', isSelected ? 'text-canopy-green' : 'text-canopy-muted')} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Tool Details */}
        {activeTool && (
          <aside className="rounded-lg border border-canopy-border bg-canopy-surface p-5 space-y-5 sticky top-20 h-fit">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-canopy-green">{activeTool.category} Tool</span>
                <span className="font-mono text-[10px] text-canopy-muted">Rate: {activeTool.rateLimit}</span>
              </div>
              <h3 className="mt-1 text-base font-semibold text-white">{activeTool.title}</h3>
              <p className="font-mono text-xs text-canopy-secondary mt-1">{activeTool.name}</p>
            </div>

            <p className="text-xs text-canopy-secondary leading-relaxed border-t border-canopy-border pt-3">
              {activeTool.description}
            </p>

            {/* Inputs Schema */}
            <div className="space-y-2 border-t border-canopy-border pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">Input Parameters</h4>
              {activeTool.inputs.length === 0 ? (
                <p className="text-xs text-canopy-muted italic">No input parameters required</p>
              ) : (
                <div className="space-y-2">
                  {activeTool.inputs.map((input) => (
                    <div key={input.name} className="rounded border border-canopy-border/80 bg-canopy-bg p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-white">{input.name}</span>
                        <span className="text-[10px] text-canopy-muted">{input.type} {input.required ? '(required)' : '(optional)'}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-canopy-secondary">{input.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Return Shape */}
            <div className="space-y-2 border-t border-canopy-border pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">Return Shape</h4>
              <div className="rounded border border-canopy-border bg-canopy-bg p-3 font-mono text-[11px] text-canopy-secondary overflow-x-auto">
                <pre>{JSON.stringify(activeTool.returns, null, 2)}</pre>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-300/90 flex items-start gap-2">
              <Shield className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>Scoped to the authenticated token principal. Cross-user access is rejected with a 404/403.</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
