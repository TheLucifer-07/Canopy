import React from 'react';
import { GitBranch, Brain, Split, ExternalLink } from 'lucide-react';
import { Badge, cn } from '@canopy/ui';

export function CitationBadge({ citation, versions = [], memories = [], onClick, className }) {
  if (!citation) return null;
  const kind = (citation.kind || '').toLowerCase();
  const id = citation.id;

  if (kind === 'version') {
    const version = versions.find((v) => v.id === id);
    const label = version?.sequence ? `V${version.sequence}` : id ? `V:${id.slice(0, 8)}` : 'Version';
    const action = version?.actions?.[0]?.type || version?.action_type || '';

    return (
      <button
        type="button"
        onClick={() => onClick?.({ kind: 'version', id, version })}
        className={cn(
          'inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 hover:border-emerald-500/50',
          className
        )}
        title={`Inspect Version ${label}${action ? ` (${action})` : ''}`}
      >
        <GitBranch className="h-3 w-3 text-emerald-400 shrink-0" />
        <span className="font-semibold">{label}</span>
        {action ? <span className="text-[10px] text-emerald-400/80 uppercase">({action})</span> : null}
      </button>
    );
  }

  if (kind === 'memory') {
    const memory = memories.find((m) => m.id === id);
    const type = memory?.type || 'memory';
    const snippet = memory?.statement ? `${memory.statement.slice(0, 30)}...` : id.slice(0, 8);

    return (
      <button
        type="button"
        onClick={() => onClick?.({ kind: 'memory', id, memory })}
        className={cn(
          'inline-flex items-center gap-1.5 rounded border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 transition hover:bg-purple-500/20 hover:border-purple-500/50',
          className
        )}
        title={`View Creative Memory: ${memory?.statement || id}`}
      >
        <Brain className="h-3 w-3 text-purple-400 shrink-0" />
        <span className="capitalize">{type}:</span>
        <span className="max-w-40 truncate text-[11px] text-purple-200">{snippet}</span>
      </button>
    );
  }

  if (kind === 'diff') {
    return (
      <button
        type="button"
        onClick={() => onClick?.({ kind: 'diff', id })}
        className={cn(
          'inline-flex items-center gap-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20 hover:border-cyan-500/50',
          className
        )}
        title="Inspect Semantic Diff"
      >
        <Split className="h-3 w-3 text-cyan-400 shrink-0" />
        <span>Diff Record</span>
      </button>
    );
  }

  return (
    <Badge variant="default" className={cn('text-xs', className)}>
      {kind}: {id.slice(0, 8)}
    </Badge>
  );
}
