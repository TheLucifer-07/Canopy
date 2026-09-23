import React, { useState } from 'react';
import {
  Code2, Cpu, Key, FileText, Terminal, Layers, ShieldCheck
} from 'lucide-react';
import { cn } from '@canopy/ui';
import { McpOverview } from './McpOverview.jsx';
import { McpToolsList } from './McpToolsList.jsx';
import { ApiKeysManager } from './ApiKeysManager.jsx';
import { ApiReference } from './ApiReference.jsx';

const TABS = [
  { id: 'overview', label: 'MCP Overview', icon: Cpu },
  { id: 'tools', label: 'MCP Tools (9)', icon: Terminal },
  { id: 'tokens', label: 'API Keys / PATs', icon: Key },
  { id: 'api', label: 'API Reference', icon: FileText }
];

export function DevelopersView({ api, user }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="px-5 py-8 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-canopy-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">Developer Platform</p>
          <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Canopy for Developers & AI Agents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-canopy-secondary">
            Integrate Canopy's creative versioning, lineage DAGs, and semantic diff intelligence into Claude Desktop, Cursor, AI agents, and CI pipelines via MCP and REST APIs.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-canopy-border bg-canopy-surface px-3 py-1.5 text-xs text-canopy-secondary">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>MCP Server v0.1.0 Ready</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-canopy-border pb-4" aria-label="Developer Navigation">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium transition',
                isActive
                  ? 'border-canopy-green bg-canopy-green/10 text-white font-semibold'
                  : 'border-canopy-border text-canopy-secondary hover:bg-canopy-surface hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-canopy-green' : 'text-canopy-muted')} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab Panels */}
      {activeTab === 'overview' && <McpOverview api={api} onNavigateTab={setActiveTab} />}
      {activeTab === 'tools' && <McpToolsList />}
      {activeTab === 'tokens' && <ApiKeysManager api={api} />}
      {activeTab === 'api' && <ApiReference />}
    </div>
  );
}
