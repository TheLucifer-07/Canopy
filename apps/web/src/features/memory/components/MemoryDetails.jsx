import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Brain, CheckCircle, Archive, Edit3, GitBranch,
  ShieldCheck, AlertTriangle, Calendar, User, Sparkles, ExternalLink, Loader2
} from 'lucide-react';
import { Button, Badge, PropertyRow, Input, Textarea, cn } from '@canopy/ui';

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const d = new Date(dateString);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function MemoryDetails({
  api,
  projectId,
  memory,
  versions = [],
  onBack,
  onOpenWorkbench
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editStatement, setEditStatement] = useState(memory.statement);
  const [editRationale, setEditRationale] = useState(memory.rationale || '');
  const [actionError, setActionError] = useState(null);

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmMemory(memory.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-memories', projectId] });
      onBack();
    },
    onError: (err) => setActionError(err?.message || 'Failed to accept memory.')
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.archiveMemory(memory.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-memories', projectId] });
      onBack();
    },
    onError: (err) => setActionError(err?.message || 'Failed to archive memory.')
  });

  const editMutation = useMutation({
    mutationFn: () => api.editMemory(memory.id, {
      statement: editStatement.trim(),
      rationale: editRationale.trim() || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-memories', projectId] });
      setIsEditing(false);
      onBack();
    },
    onError: (err) => setActionError(err?.message || 'Failed to update memory.')
  });

  const isProposed = memory.status === 'proposed';
  const isActive = memory.status === 'active';
  const isUserAuthored = memory.origin === 'user_authored';

  const sourceRefs = memory.source_refs || {};
  const versionIds = sourceRefs.versions || (sourceRefs.version_id ? [sourceRefs.version_id] : []);
  const referencedVersions = versionIds.map((id) => versions.find((v) => v.id === id)).filter(Boolean);

  return (
    <div className="flex flex-col h-full min-h-[500px] border border-canopy-border bg-canopy-surface rounded-lg overflow-hidden">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-canopy-border bg-canopy-elevated/40 px-5 py-3.5 gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-canopy-secondary hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Memories
          </Button>
          <div className="h-4 w-px bg-canopy-border" />
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-canopy-green" />
            <span className="text-sm font-semibold text-white">Memory Details</span>
            <Badge variant={isActive ? 'success' : isProposed ? 'warning' : 'default'} className="text-[10px] uppercase">
              {memory.status}
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isProposed && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                Accept Proposal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="gap-1.5 text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Archive className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {isActive && !isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <Edit3 className="h-4 w-4" />
                Edit as Successor
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="gap-1.5 text-canopy-muted hover:text-rose-300"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid flex-1 lg:grid-cols-[1fr_340px] divide-y lg:divide-y-0 lg:divide-x divide-canopy-border">
        {/* Memory Statement / Edit Pane */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {actionError && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {actionError}
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">
                  Creative Statement
                </div>
                <h1 className="text-xl font-semibold text-white leading-relaxed">
                  "{memory.statement}"
                </h1>
              </div>

              {memory.rationale && (
                <div className="space-y-1.5 pt-4 border-t border-canopy-border/60">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">
                    Creative Rationale
                  </div>
                  <p className="text-sm text-canopy-secondary leading-relaxed">
                    {memory.rationale}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-secondary">
                  Edit Memory Statement
                </label>
                <Textarea
                  value={editStatement}
                  onChange={(e) => setEditStatement(e.target.value)}
                  className="h-28 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-secondary">
                  Edit Rationale
                </label>
                <Input
                  value={editRationale}
                  onChange={(e) => setEditRationale(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => editMutation.mutate()}
                  disabled={!editStatement.trim() || editMutation.isPending}
                >
                  {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save Successor Memory
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Metadata & Provenance Panel */}
        <div className="p-6 space-y-6 overflow-y-auto bg-canopy-surface">
          {/* Authority & Provenance */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-canopy-green" />
              Authority & Provenance
            </div>

            <div className="space-y-3 rounded-md border border-canopy-border bg-canopy-elevated/30 p-3.5 text-xs">
              <PropertyRow
                label="Authority"
                value={isUserAuthored ? 'Authoritative (User-Authored)' : 'Inferred Proposal (AI-Extracted)'}
              />
              <PropertyRow label="Semantic Type" value={memory.type?.toUpperCase()} />
              <PropertyRow label="Origin Source" value={memory.origin} />
              <PropertyRow label="Status" value={memory.status?.toUpperCase()} />
              <PropertyRow label="Memory ID" value={memory.id} mono />
              <PropertyRow label="Created Date" value={formatDate(memory.created_at)} />
            </div>
          </section>

          {/* Related Versions */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-canopy-green" />
              Related Project Versions ({referencedVersions.length})
            </div>

            {referencedVersions.length > 0 ? (
              <div className="space-y-2">
                {referencedVersions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md border border-canopy-border bg-canopy-elevated/40 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-canopy-green/10 text-[10px] font-bold text-canopy-green border border-canopy-green/30">
                        V{v.sequence}
                      </div>
                      <span className="font-semibold text-white">{v.label || `Version ${v.sequence}`}</span>
                    </div>

                    {onOpenWorkbench && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenWorkbench({ versionId: v.id })}
                        className="h-6 px-2 text-[11px] text-canopy-green hover:text-white"
                      >
                        Open
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-canopy-muted italic">
                Applies globally across all project versions.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
