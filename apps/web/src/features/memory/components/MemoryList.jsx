import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, Plus, Search, Filter, ShieldCheck, Sparkles, CheckCircle2,
  Archive, Edit3, ChevronRight, AlertCircle, HardDrive, Check, X
} from 'lucide-react';
import { Button, Badge, Input, EmptyState, LoadingState, ErrorState, cn } from '@canopy/ui';
import { MemoryComposerModal } from './MemoryComposerModal.jsx';
import { MemoryDetails } from './MemoryDetails.jsx';

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function MemoryList({ api, projectId, onOpenWorkbench }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'proposed' | 'all'
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedMemoryId, setSelectedMemoryId] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Lineage query to associate version metadata with memories
  const lineageQuery = useQuery({
    queryKey: ['lineage', projectId],
    queryFn: () => api.getLineage(projectId),
    enabled: Boolean(projectId)
  });
  const versions = lineageQuery.data?.versions || [];

  // Memories query
  const memoriesQuery = useQuery({
    queryKey: ['memories', projectId, statusFilter],
    queryFn: () => api.listMemories(projectId, {
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
    enabled: Boolean(projectId)
  });

  const memories = memoriesQuery.data?.data || memoriesQuery.data || [];

  const confirmMutation = useMutation({
    mutationFn: (id) => api.confirmMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.archiveMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    }
  });

  const filteredMemories = useMemo(() => {
    return (Array.isArray(memories) ? memories : []).filter((m) => {
      const matchesSearch = !searchQuery ||
        m.statement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.rationale?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || m.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [memories, searchQuery, typeFilter]);

  const selectedMemory = useMemo(() => {
    return (Array.isArray(memories) ? memories : []).find((m) => m.id === selectedMemoryId) || null;
  }, [memories, selectedMemoryId]);

  if (selectedMemory) {
    return (
      <MemoryDetails
        api={api}
        projectId={projectId}
        memory={selectedMemory}
        versions={versions}
        onBack={() => setSelectedMemoryId(null)}
        onOpenWorkbench={onOpenWorkbench}
      />
    );
  }

  const activeCount = (Array.isArray(memories) ? memories : []).filter((m) => m.status === 'active').length;
  const proposedCount = (Array.isArray(memories) ? memories : []).filter((m) => m.status === 'proposed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-canopy-border pb-5">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <Brain className="h-5 w-5 text-canopy-green" />
            Creative Memory
          </h2>
          <p className="mt-1 text-xs text-canopy-secondary">
            Preserve creative decisions, constraints, and client preferences across version history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsComposerOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Memory
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
          <Input
            type="text"
            placeholder="Search memory statements or rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-canopy-border bg-canopy-surface p-0.5 text-xs">
            {[
              { key: 'active', label: `Active (${activeCount})` },
              { key: 'proposed', label: `Proposed (${proposedCount})` },
              { key: 'all', label: 'All' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  'rounded px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === tab.key
                    ? 'bg-canopy-green/20 text-canopy-green font-semibold'
                    : 'text-canopy-secondary hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-canopy-border bg-canopy-surface px-2.5 py-1.5 text-xs text-white outline-none focus:border-canopy-green"
          >
            <option value="all">All Types</option>
            <option value="preference">Preference</option>
            <option value="constraint">Constraint</option>
            <option value="decision">Decision</option>
            <option value="rejection">Rejection</option>
            <option value="goal">Goal</option>
            <option value="insight">Insight</option>
          </select>
        </div>
      </div>

      {/* Query State */}
      {memoriesQuery.isLoading ? (
        <LoadingState label="Loading creative memories..." />
      ) : memoriesQuery.isError ? (
        <ErrorState
          message={memoriesQuery.error?.message || 'Failed to load memories.'}
          retry={() => memoriesQuery.refetch()}
        />
      ) : filteredMemories.length === 0 ? (
        memories.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-10 w-10 text-canopy-green opacity-80" />}
            title="Memory is empty"
            description="Capture creative decisions, preferences, and constraints so Canopy can preserve them across versions."
            action={
              <Button onClick={() => setIsComposerOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Memory
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No matching memories"
            description="Try adjusting your search terms or filter selection."
          />
        )
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((mem) => {
            const isActive = mem.status === 'active';
            const isProposed = mem.status === 'proposed';
            const isUserAuthored = mem.origin === 'user_authored';

            return (
              <div
                key={mem.id}
                onClick={() => setSelectedMemoryId(mem.id)}
                className={cn(
                  'group flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-150 gap-4',
                  isProposed
                    ? 'border-purple-500/30 bg-purple-500/[0.03] hover:border-purple-500/60'
                    : 'border-canopy-border bg-canopy-surface hover:border-canopy-green/60 hover:shadow-md'
                )}
              >
                {/* Main Content */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={isActive ? 'success' : isProposed ? 'warning' : 'default'} className="text-[10px] uppercase">
                      {mem.status}
                    </Badge>
                    <Badge variant="default" className="text-[10px] capitalize">
                      {mem.type}
                    </Badge>
                    <span className="text-[11px] text-canopy-muted">
                      {isUserAuthored ? 'User Authored' : 'AI Extracted Proposal'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white leading-relaxed">
                    "{mem.statement}"
                  </p>

                  {mem.rationale && (
                    <p className="text-xs text-canopy-secondary line-clamp-1">
                      {mem.rationale}
                    </p>
                  )}
                </div>

                {/* Right Actions & Meta */}
                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isProposed && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => confirmMutation.mutate(mem.id)}
                        disabled={confirmMutation.isPending}
                        className="h-7 px-2.5 text-xs gap-1"
                        title="Accept into active memories"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => archiveMutation.mutate(mem.id)}
                        disabled={archiveMutation.isPending}
                        className="h-7 px-2 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
                        title="Reject proposal"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  <span className="text-[11px] text-canopy-muted hidden sm:block">
                    {formatDate(mem.created_at)}
                  </span>

                  <ChevronRight className="h-4 w-4 text-canopy-muted group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer Modal */}
      <MemoryComposerModal
        api={api}
        projectId={projectId}
        versions={versions}
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onCreated={(newMem) => {
          setSelectedMemoryId(newMem.id);
        }}
      />
    </div>
  );
}
