import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  GitCommit, ArrowLeftRight, X, Sparkles, RefreshCw,
  ExternalLink, Download, Layers, ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
import { Button, Badge, LoadingState, ErrorState, cn } from '@canopy/ui';
import { VisualDiff } from './VisualDiff.jsx';
import { EvidencePanel } from './EvidencePanel.jsx';
import { ChangeHistory } from './ChangeHistory.jsx';

export function VersionCompareModal({
  api,
  projectId,
  versions = [],
  initialFromVersionId = null,
  initialToVersionId = null,
  isOpen = true,
  onClose,
  onOpenWorkbench
}) {
  const [fromVersionId, setFromVersionId] = useState(initialFromVersionId);
  const [toVersionId, setToVersionId] = useState(initialToVersionId);

  // Default selection if not provided
  useEffect(() => {
    if (versions.length >= 2) {
      if (!fromVersionId) setFromVersionId(versions[versions.length - 2]?.id);
      if (!toVersionId) setToVersionId(versions[versions.length - 1]?.id);
    } else if (versions.length === 1) {
      if (!toVersionId) setToVersionId(versions[0]?.id);
    }
  }, [versions, fromVersionId, toVersionId]);

  const fromVersion = useMemo(() => versions.find((v) => v.id === fromVersionId) || null, [versions, fromVersionId]);
  const toVersion = useMemo(() => versions.find((v) => v.id === toVersionId) || null, [versions, toVersionId]);

  // Asset URLs for both versions
  const fromAssetQuery = useQuery({
    queryKey: ['asset-url', fromVersion?.asset_id],
    queryFn: () => api.getAssetUrl(fromVersion.asset_id),
    enabled: Boolean(fromVersion?.asset_id)
  });

  const toAssetQuery = useQuery({
    queryKey: ['asset-url', toVersion?.asset_id],
    queryFn: () => api.getAssetUrl(toVersion.asset_id),
    enabled: Boolean(toVersion?.asset_id)
  });

  // Semantic Diff Query / Mutation
  const diffMutation = useMutation({
    mutationFn: (params = {}) => {
      if (!fromVersionId || !toVersionId) return null;
      if (fromVersionId === toVersionId) {
        throw new Error('Please select two distinct versions to compare.');
      }
      return api.createDiff({
        from_version_id: fromVersionId,
        to_version_id: toVersionId,
        force_refresh: Boolean(params.forceRefresh)
      });
    }
  });

  // Auto trigger diff when both version IDs are valid and different
  useEffect(() => {
    if (fromVersionId && toVersionId && fromVersionId !== toVersionId) {
      diffMutation.mutate({ forceRefresh: false });
    }
  }, [fromVersionId, toVersionId]);

  function handleSwap() {
    const temp = fromVersionId;
    setFromVersionId(toVersionId);
    setToVersionId(temp);
  }

  if (!isOpen) return null;

  const isSameVersion = fromVersionId && toVersionId && fromVersionId === toVersionId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-xl border border-canopy-border bg-canopy-surface shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-canopy-border bg-canopy-elevated/50 px-6 py-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-canopy-green/10 p-2 text-canopy-green border border-canopy-green/30">
              <GitCommit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Compare Creative Versions</h2>
              <p className="text-xs text-canopy-secondary">
                Visual and semantic diff with multi-stream evidence analysis.
              </p>
            </div>
          </div>

          {/* Version Selection Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-canopy-border bg-canopy-surface p-1.5 text-xs">
              <select
                value={fromVersionId || ''}
                onChange={(e) => setFromVersionId(e.target.value)}
                className="rounded bg-canopy-elevated px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-canopy-green"
              >
                <option value="" disabled>Base Version</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    V{v.sequence} — {v.label || v.action_type || 'Version'}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSwap}
                title="Swap versions"
                className="rounded p-1.5 text-canopy-secondary hover:bg-canopy-elevated hover:text-white transition-colors"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>

              <select
                value={toVersionId || ''}
                onChange={(e) => setToVersionId(e.target.value)}
                className="rounded bg-canopy-elevated px-2.5 py-1.5 text-xs font-semibold text-canopy-green outline-none focus:border-canopy-green"
              >
                <option value="" disabled>Target Version</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    V{v.sequence} — {v.label || v.action_type || 'Version'}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => diffMutation.mutate({ forceRefresh: true })}
              disabled={diffMutation.isPending || isSameVersion}
              title="Force re-analyze semantic difference"
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', diffMutation.isPending && 'animate-spin')} />
              Re-analyze
            </Button>

            <button
              onClick={onClose}
              className="rounded p-1.5 text-canopy-muted hover:bg-canopy-elevated hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isSameVersion ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center text-xs text-amber-200">
              <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <div className="font-semibold text-sm text-white">Identical Version Selected</div>
              <p className="mt-1 max-w-md mx-auto text-canopy-secondary">
                You have selected Version {fromVersion?.sequence} for both sides of the comparison. Please select two distinct versions.
              </p>
            </div>
          ) : (
            <>
              {/* Visual Diff Component */}
              <VisualDiff
                fromVersion={fromVersion}
                toVersion={toVersion}
                fromAssetUrl={fromAssetQuery.data?.url}
                toAssetUrl={toAssetQuery.data?.url}
                isLoadingAssets={fromAssetQuery.isLoading || toAssetQuery.isLoading}
              />

              {/* Semantic Summary Hero */}
              {diffMutation.isPending ? (
                <div className="rounded-lg border border-canopy-border bg-canopy-elevated/20 p-8">
                  <LoadingState label="Synthesizing multi-source semantic diff & visual evidence..." />
                </div>
              ) : diffMutation.isError ? (
                <ErrorState
                  message={diffMutation.error?.message || 'Could not generate semantic diff.'}
                  retry={() => diffMutation.mutate({ forceRefresh: true })}
                />
              ) : diffMutation.data ? (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="rounded-lg border border-canopy-green/30 bg-canopy-green/[0.04] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">
                      <Sparkles className="h-4 w-4" />
                      Semantic Difference Summary
                    </div>
                    <p className="text-sm font-medium text-white leading-relaxed">
                      {diffMutation.data.summary || 'Versions successfully compared with verified lineage.'}
                    </p>
                  </div>

                  {/* Evidence Explorer Panel */}
                  <EvidencePanel
                    diffResult={diffMutation.data}
                    fromVersion={fromVersion}
                    toVersion={toVersion}
                  />

                  {/* Change History Path */}
                  <ChangeHistory
                    fromVersion={fromVersion}
                    toVersion={toVersion}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between border-t border-canopy-border bg-canopy-elevated/30 px-6 py-3.5 gap-3">
          <div className="text-xs text-canopy-muted">
            Comparing <span className="text-white font-medium">V{fromVersion?.sequence || '?'}</span> with <span className="text-canopy-green font-medium">V{toVersion?.sequence || '?'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenWorkbench && toVersion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenWorkbench({ versionId: toVersion.id });
                  onClose();
                }}
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open V{toVersion.sequence} in Workbench
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
