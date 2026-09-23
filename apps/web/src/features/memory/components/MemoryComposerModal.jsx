import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, X, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input, Textarea, cn } from '@canopy/ui';

const MEMORY_TYPES = [
  { value: 'preference', label: 'Preference', desc: 'Creative style or aesthetic taste' },
  { value: 'constraint', label: 'Constraint', desc: 'Hard technical or creative limit' },
  { value: 'decision', label: 'Decision', desc: 'Explicit direction chosen by creator/team' },
  { value: 'rejection', label: 'Rejection', desc: 'Direction discarded or rejected' },
  { value: 'goal', label: 'Goal', desc: 'High-level creative aspiration' },
  { value: 'insight', label: 'Insight', desc: 'Observed learning from evolution' }
];

export function MemoryComposerModal({
  api,
  projectId,
  versions = [],
  initialType = 'preference',
  isOpen,
  onClose,
  onCreated
}) {
  const queryClient = useQueryClient();
  const [statement, setStatement] = useState('');
  const [rationale, setRationale] = useState('');
  const [type, setType] = useState(initialType);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!statement.trim()) {
        throw new Error('Memory statement is required.');
      }
      return api.createMemory(projectId, {
        type,
        statement: statement.trim(),
        rationale: rationale.trim() || undefined,
        source_refs: selectedVersionId ? { versions: [selectedVersionId] } : {}
      });
    },
    onSuccess: (newMemory) => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-memories', projectId] });
      if (onCreated) onCreated(newMemory);
      handleClose();
    },
    onError: (err) => {
      setError(err?.message || 'Failed to save memory.');
    }
  });

  if (!isOpen) return null;

  function handleClose() {
    setStatement('');
    setRationale('');
    setSelectedVersionId('');
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-lg border border-canopy-border bg-canopy-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-canopy-border bg-canopy-elevated/40 px-5 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-canopy-green" />
            <h3 className="text-base font-semibold text-white">Add Creative Memory</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="rounded p-1 text-canopy-muted hover:bg-canopy-elevated hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Statement */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-canopy-secondary mb-1.5">
              Memory Statement <span className="text-rose-400">*</span>
            </label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g. Client rejects blue-dominant backgrounds — reads as corporate."
              className="h-24 text-xs"
              maxLength={500}
            />
            <div className="flex justify-between mt-1 text-[11px] text-canopy-muted">
              <span>Preserved as authoritative active memory</span>
              <span>{statement.length} / 500</span>
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-canopy-secondary mb-1.5">
              Memory Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MEMORY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'flex flex-col p-2.5 rounded-md border text-left transition-colors',
                    type === t.value
                      ? 'border-canopy-green bg-canopy-green/10 text-white font-medium'
                      : 'border-canopy-border bg-canopy-elevated/30 text-canopy-secondary hover:text-white hover:border-canopy-border/80'
                  )}
                >
                  <span className="text-xs font-semibold capitalize">{t.label}</span>
                  <span className="text-[10px] text-canopy-muted mt-0.5 line-clamp-1">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rationale (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-canopy-secondary mb-1.5">
              Creative Rationale <span className="text-canopy-muted font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why was this decision or constraint established?"
              className="text-xs"
            />
          </div>

          {/* Version Context (Optional) */}
          {versions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-canopy-secondary mb-1.5">
                Related Version <span className="text-canopy-muted font-normal">(Optional)</span>
              </label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full rounded-md border border-canopy-border bg-canopy-elevated px-3 py-2 text-xs text-white outline-none focus:border-canopy-green"
              >
                <option value="">None (Project-wide)</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    V{v.sequence} — {v.label || v.action_type || 'Version'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-canopy-border bg-canopy-elevated/20 px-5 py-3.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!statement.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving memory...
              </>
            ) : (
              'Save Memory'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
