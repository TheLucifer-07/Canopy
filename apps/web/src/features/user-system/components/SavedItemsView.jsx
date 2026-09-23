import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkX,
  FolderKanban,
  GitCommit,
  Image as ImageIcon,
  Library,
  Layers,
  ArrowUpRight,
  Trash2
} from 'lucide-react';
import { cn, Button } from '@canopy/ui';
import { formatRelativeTime } from '../../workspace/services/workspaceData.js';

export function SavedItemsView({ hook, onNavigate }) {
  const { savedItems, loading, error, unsaveItem } = hook;
  const [filter, setFilter] = useState('all'); // 'all' | 'project' | 'version' | 'asset' | 'memory'

  const filteredItems = filter === 'all'
    ? savedItems
    : savedItems.filter((item) => item.entity_type === filter);

  const getEntityIcon = (type) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="h-4 w-4 text-canopy-green" />;
      case 'version':
        return <GitCommit className="h-4 w-4 text-emerald-400" />;
      case 'asset':
        return <ImageIcon className="h-4 w-4 text-sky-400" />;
      case 'memory':
        return <Library className="h-4 w-4 text-amber-400" />;
      case 'diff':
        return <Layers className="h-4 w-4 text-purple-400" />;
      default:
        return <Bookmark className="h-4 w-4 text-canopy-green" />;
    }
  };

  const handleOpenItem = (item) => {
    if (item.entity_type === 'project') {
      onNavigate?.({ name: 'project-home', projectId: item.entity_id });
    } else if (item.entity_type === 'version' && item.metadata?.project_id) {
      onNavigate?.({ name: 'project-home', projectId: item.metadata.project_id });
    }
  };

  return (
    <div className="px-5 py-8 lg:px-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-canopy-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">Personal Bookmarks</p>
          <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Saved Items</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-canopy-secondary">
            Quick access to bookmarked creative projects, pivotal versions, key reference assets, and confirmed memories.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-canopy-border bg-canopy-surface px-3 py-1.5 text-xs text-canopy-secondary font-mono">
          <Bookmark className="h-3.5 w-3.5 text-canopy-green" />
          <span>{savedItems.length} saved</span>
        </div>
      </header>

      {/* Filter Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-canopy-border pb-4">
        {[
          { id: 'all', label: 'All Items', count: savedItems.length },
          { id: 'project', label: 'Projects', count: savedItems.filter((i) => i.entity_type === 'project').length },
          { id: 'version', label: 'Versions', count: savedItems.filter((i) => i.entity_type === 'version').length },
          { id: 'asset', label: 'Assets', count: savedItems.filter((i) => i.entity_type === 'asset').length },
          { id: 'memory', label: 'Memories', count: savedItems.filter((i) => i.entity_type === 'memory').length }
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition',
                isActive
                  ? 'border-canopy-green bg-canopy-green/10 text-white font-semibold'
                  : 'border-canopy-border text-canopy-secondary hover:bg-canopy-surface hover:text-white'
              )}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[11px] text-canopy-muted">({tab.count})</span>
            </button>
          );
        })}
      </nav>

      {/* List */}
      {loading && savedItems.length === 0 ? (
        <div className="py-16 text-center text-sm text-canopy-muted">Loading saved items...</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-6 text-center text-sm text-rose-300">
          {error}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const meta = item.metadata || {};
            const title = meta.name || (meta.sequence ? `Version V${meta.sequence}` : meta.statement || `${item.entity_type.toUpperCase()} Bookmark`);
            const subtitle = meta.project_name || meta.type || meta.mime || `Saved ${item.entity_type}`;

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 transition hover:border-canopy-green/50 hover:bg-canopy-surface shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-canopy-border bg-canopy-elevated px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-canopy-secondary">
                      {getEntityIcon(item.entity_type)}
                      <span>{item.entity_type}</span>
                    </span>

                    <button
                      onClick={() => unsaveItem(item.id)}
                      title="Remove from saved items"
                      className="rounded-md p-1 text-canopy-muted opacity-60 hover:opacity-100 hover:text-rose-400 hover:bg-rose-950/20 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-canopy-green transition line-clamp-2">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-canopy-secondary line-clamp-2">
                    {subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-canopy-border/50 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-canopy-muted">
                    {formatRelativeTime(item.created_at)}
                  </span>

                  {(item.entity_type === 'project' || item.metadata?.project_id) && (
                    <button
                      onClick={() => handleOpenItem(item)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-green hover:underline"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/40 p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-canopy-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-white">You haven't saved anything yet</h3>
          <p className="mt-1 text-xs text-canopy-secondary max-w-sm mx-auto">
            Click the bookmark icon on projects, versions, or memories to pin them here for rapid access.
          </p>
        </div>
      )}
    </div>
  );
}
