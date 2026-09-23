import React, { useState, useEffect } from 'react';
import {
  Activity,
  FolderKanban,
  GitCommit,
  Image as ImageIcon,
  Library,
  Sparkles,
  ArrowUpRight,
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { cn } from '@canopy/ui';
import { formatRelativeTime } from '../../workspace/services/workspaceData.js';

export function ActivityFeedView({ api, onOpenProject }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadActivity() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getActivity({ limit: 100 });
        if (mounted) {
          setActivities(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load activity stream.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadActivity();
    return () => {
      mounted = false;
    };
  }, [api]);

  const filtered = activities.filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (a.action && a.action.toLowerCase().includes(term)) ||
      (a.project_name && a.project_name.toLowerCase().includes(term)) ||
      (a.type && a.type.toLowerCase().includes(term))
    );
  });

  // Group into Today, Yesterday, Earlier
  const groups = {
    today: [],
    yesterday: [],
    earlier: []
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  filtered.forEach((item) => {
    const itemTime = new Date(item.timestamp).getTime();
    if (itemTime >= startOfToday) {
      groups.today.push(item);
    } else if (itemTime >= startOfYesterday) {
      groups.yesterday.push(item);
    } else {
      groups.earlier.push(item);
    }
  });

  const renderActivityGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">
          <Calendar className="h-3.5 w-3.5 text-canopy-green" />
          <span>{title}</span>
          <span className="rounded-full bg-canopy-surface border border-canopy-border px-2 py-0.2 text-[10px] font-mono text-canopy-secondary">
            {items.length}
          </span>
        </div>

        <div className="relative border-l-2 border-canopy-border/80 ml-3.5 space-y-4 py-1">
          {items.map((item) => (
            <div key={item.id} className="relative pl-6">
              <span className="absolute -left-[9px] top-2 h-4 w-4 rounded-full border-2 border-canopy-bg bg-canopy-green shadow-sm" />
              <div className="group rounded-xl border border-canopy-border/80 bg-canopy-surface/60 p-4 transition hover:bg-canopy-surface hover:border-canopy-green/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="rounded-lg bg-canopy-green/10 p-1.5 text-canopy-green shrink-0">
                      {item.type === 'asset_import' ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <GitCommit className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.action}</p>
                      <p className="mt-0.5 text-xs text-canopy-secondary">
                        Project:{' '}
                        <button
                          onClick={() => item.project_id && onOpenProject?.(item.project_id)}
                          className="text-canopy-green font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <span>{item.project_name || 'Creative Project'}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-xs text-canopy-muted shrink-0 self-start sm:self-auto">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="px-5 py-8 lg:px-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-canopy-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">Audit & Lineage</p>
          <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Creative Activity Feed</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-canopy-secondary">
            Authoritative chronological trail of all versions created, DAG branches explored, assets imported, and decisions recorded across your workspace.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="w-full rounded-lg border border-canopy-border bg-canopy-surface pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
          />
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm text-canopy-muted">Loading creative activity trail...</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-6 text-center text-sm text-rose-300">
          {error}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-8">
          {renderActivityGroup('Today', groups.today)}
          {renderActivityGroup('Yesterday', groups.yesterday)}
          {renderActivityGroup('Earlier', groups.earlier)}
        </div>
      ) : (
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/40 p-12 text-center">
          <Activity className="mx-auto h-10 w-10 text-canopy-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-white">No activity found</h3>
          <p className="mt-1 text-xs text-canopy-secondary max-w-sm mx-auto">
            {search ? `No activity events matched "${search}".` : 'Creative actions and version commits will appear in this timeline.'}
          </p>
        </div>
      )}
    </div>
  );
}
