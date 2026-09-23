import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, GitCommit, GitMerge, Network } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, LoadingState, cn } from '@canopy/ui';
import { formatRelativeTime, versionTitle } from '../../workspace/services/workspaceData.js';
import { formatError } from '../../../shared/api.js';
import { summarizeLineage } from '@canopy/domain';
import { VersionCompareModal } from '../../diff/index.js';

/**
 * Full Version History panel for ProjectHome.
 * Shows a complete history of all versions with lineage summary stats.
 */
export function VersionHistory({ api, projectId, onOpenWorkbench }) {
  const [compareTarget, setCompareTarget] = useState(null);
  const lineage = useQuery({
    queryKey: ['lineage', projectId],
    queryFn: () => api.getLineage(projectId)
  });

  const versions = useMemo(() => {
    return [...(lineage.data?.versions || [])].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [lineage.data]);

  const edges = lineage.data?.edges || [];
  const summary = useMemo(
    () => (versions.length ? summarizeLineage({ versions, edges }) : null),
    [versions, edges]
  );

  if (lineage.isLoading) return <LoadingState label="Loading version history" className="min-h-[30vh]" />;
  if (lineage.error) return <ErrorState message={formatError(lineage.error, 'Could not load version history.')} />;
  if (!versions.length) return <EmptyState title="No version history" description="Open the workbench to create the first version." />;

  return (
    <section className="mt-8 max-w-4xl">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-canopy-muted">Version History</h2>

      {/* Lineage Summary Cards */}
      {summary && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Total Versions" value={versions.length} icon={GitCommit} />
          <SummaryCard label="Branch Points" value={summary.branch_points.length} icon={GitBranch} />
          <SummaryCard label="Active Tips" value={summary.tips.length} icon={Network} />
          <SummaryCard label="Roots" value={summary.roots.length} icon={GitCommit} />
        </div>
      )}

      {/* Version List */}
      <div className="mt-6 divide-y divide-canopy-border border-y border-canopy-border">
        {versions.map((version) => {
          const isMerge = edges.some((e) => e.version_id === version.id && e.role === 'merge_source');
          const parentCount = edges.filter((e) => e.version_id === version.id).length;
          const childCount = edges.filter((e) => e.parent_version_id === version.id).length;

          return (
            <div
              key={version.id}
              className="flex items-start gap-4 py-4 group"
            >
              {/* Icon */}
              <div className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                version.is_root
                  ? 'border-canopy-green/30 bg-canopy-green/10 text-canopy-green'
                  : isMerge
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                    : 'border-canopy-border bg-canopy-surface text-canopy-secondary'
              )}>
                {version.is_root ? <GitCommit className="h-4 w-4" /> : isMerge ? <GitMerge className="h-4 w-4" /> : <GitCommit className="h-4 w-4" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{versionTitle(version)}</span>
                  <Badge variant={version.actor_type === 'human' ? 'human' : 'model'}>{version.actor_type}</Badge>
                  {version.is_root && <Badge variant="success">Root</Badge>}
                  {isMerge && <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30">Merge</Badge>}
                </div>
                <p className="mt-1 text-xs text-canopy-secondary">
                  {version.action_type || 'version'} · {formatRelativeTime(version.created_at)}
                  {parentCount > 0 && <span> · {parentCount} parent{parentCount > 1 ? 's' : ''}</span>}
                  {childCount > 0 && <span> · {childCount} child{childCount > 1 ? 'ren' : ''}</span>}
                </p>
                {version.note && (
                  <p className="mt-1.5 text-xs text-canopy-muted italic">{version.note}</p>
                )}
              </div>

              {/* Actions & Version ID */}
              <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const prev = versions.find((v) => v.sequence === version.sequence - 1) || versions.find((v) => v.id !== version.id);
                    setCompareTarget({
                      fromId: prev?.id || version.id,
                      toId: version.id
                    });
                  }}
                  className="h-7 px-2 text-xs text-canopy-secondary hover:text-white"
                >
                  Compare
                </Button>
                {onOpenWorkbench && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenWorkbench({ versionId: version.id })}
                    className="h-7 px-2 text-xs text-canopy-green hover:text-white"
                  >
                    Open
                  </Button>
                )}
                <span className="hidden text-[10px] font-mono text-canopy-muted sm:block" title={version.id}>
                  {version.id?.slice(0, 8)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {compareTarget && (
        <VersionCompareModal
          api={api}
          projectId={projectId}
          versions={versions}
          initialFromVersionId={compareTarget.fromId}
          initialToVersionId={compareTarget.toId}
          isOpen={Boolean(compareTarget)}
          onClose={() => setCompareTarget(null)}
          onOpenWorkbench={onOpenWorkbench}
        />
      )}
    </section>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="border border-canopy-border bg-canopy-surface p-4 rounded-md">
      <div className="flex items-center gap-2 text-canopy-muted">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
