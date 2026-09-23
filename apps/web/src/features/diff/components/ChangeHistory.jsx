import React from 'react';
import { ArrowRight, GitCommit, GitBranch } from 'lucide-react';
import { Badge, cn } from '@canopy/ui';

export function ChangeHistory({ pathVersions = [], fromVersion, toVersion }) {
  // If no explicit path array, fallback to fromVersion -> toVersion
  const sequence = pathVersions.length > 0
    ? pathVersions
    : [fromVersion, toVersion].filter(Boolean);

  if (sequence.length <= 1) return null;

  return (
    <div className="rounded-lg border border-canopy-border bg-canopy-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-canopy-green" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
          Creative Change History Path
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {sequence.map((ver, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === sequence.length - 1;

          return (
            <React.Fragment key={ver.id || idx}>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                  isLast
                    ? 'border-canopy-green bg-canopy-green/10 text-white font-semibold'
                    : isFirst
                    ? 'border-canopy-border bg-canopy-elevated/60 text-white'
                    : 'border-canopy-border/80 bg-canopy-surface text-canopy-secondary'
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-canopy-elevated text-[10px] font-bold">
                  V{ver.sequence}
                </div>
                <div className="flex flex-col">
                  <span className="truncate max-w-[120px]">
                    {ver.label || ver.action_type || 'Version'}
                  </span>
                </div>
                <Badge variant={ver.actor_type === 'model' ? 'model' : 'human'} className="text-[9px] py-0 px-1">
                  {ver.actor_type || 'human'}
                </Badge>
              </div>

              {!isLast && (
                <ArrowRight className="h-3.5 w-3.5 text-canopy-muted shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
