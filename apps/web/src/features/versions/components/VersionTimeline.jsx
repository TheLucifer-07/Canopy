import React from 'react';
import { GitBranch, GitCommit, GitMerge, Import, Upload } from 'lucide-react';
import { Badge, cn } from '@canopy/ui';
import { formatRelativeTime, versionTitle } from '../../workspace/services/workspaceData.js';

function actionIcon(version) {
  if (version.is_root) return Upload;
  if (version.action_type === 'merge') return GitMerge;
  if (version.action_type === 'import') return Import;
  return GitCommit;
}

function actionColor(version) {
  if (version.is_root) return 'text-canopy-green';
  if (version.action_type === 'merge') return 'text-purple-400';
  if (version.actor_type === 'model') return 'text-purple-400';
  return 'text-canopy-green';
}

function dotBg(version, isSelected) {
  if (isSelected) return 'bg-canopy-green shadow-lg shadow-canopy-green/40';
  if (version.action_type === 'merge') return 'bg-purple-500/80';
  return 'bg-canopy-elevated';
}

export function VersionTimeline({ versions = [], edges = [], selectedVersionId, onSelectVersion }) {
  const parentMap = new Map();
  for (const edge of edges) {
    if (!parentMap.has(edge.version_id)) parentMap.set(edge.version_id, []);
    parentMap.get(edge.version_id).push(edge.parent_version_id);
  }

  const childMap = new Map();
  for (const edge of edges) {
    if (!childMap.has(edge.parent_version_id)) childMap.set(edge.parent_version_id, []);
    childMap.get(edge.parent_version_id).push(edge.version_id);
  }

  const sorted = [...versions].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  return (
    <div className="relative space-y-0">
      {sorted.map((version, index) => {
        const Icon = actionIcon(version);
        const isSelected = version.id === selectedVersionId;
        const isLast = index === sorted.length - 1;
        const isBranchPoint = (childMap.get(version.id)?.length || 0) > 1;
        const isMerge = (parentMap.get(version.id)?.length || 0) > 1;

        return (
          <button
            key={version.id}
            className={cn(
              'group relative flex w-full items-start gap-3 py-3 pl-2 pr-2 text-left transition-all duration-200 rounded-md',
              isSelected
                ? 'bg-canopy-green/[0.08] ring-1 ring-canopy-green/30'
                : 'hover:bg-canopy-surface/60'
            )}
            onClick={() => onSelectVersion(version.id)}
          >
            {/* Timeline spine */}
            <div className="relative flex flex-col items-center" style={{ minWidth: '24px' }}>
              {/* Connector line (top) */}
              {index > 0 && (
                <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-canopy-border" />
              )}
              {/* Node dot */}
              <div
                className={cn(
                  'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200',
                  isSelected
                    ? 'border-canopy-green bg-canopy-green/20'
                    : 'border-canopy-border bg-canopy-elevated group-hover:border-canopy-green/50',
                  dotBg(version, isSelected)
                )}
              >
                <Icon className={cn('h-3 w-3', isSelected ? 'text-canopy-green' : actionColor(version))} />
              </div>
              {/* Connector line (bottom) */}
              {!isLast && (
                <div className="absolute top-6 left-1/2 h-[calc(100%)] w-px -translate-x-1/2 bg-canopy-border" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-semibold truncate',
                  isSelected ? 'text-white' : 'text-canopy-secondary group-hover:text-white'
                )}>
                  {versionTitle(version)}
                </span>
                {isBranchPoint && (
                  <GitBranch className="h-3 w-3 text-amber-400 flex-shrink-0" title="Branch point" />
                )}
                {isMerge && (
                  <GitMerge className="h-3 w-3 text-purple-400 flex-shrink-0" title="Merge" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] text-canopy-muted truncate">
                  {version.action_type || 'version'} · {formatRelativeTime(version.created_at)}
                </span>
                <Badge variant={version.actor_type === 'human' ? 'human' : 'model'} className="text-[10px] px-1.5 py-0">
                  {version.actor_type}
                </Badge>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
