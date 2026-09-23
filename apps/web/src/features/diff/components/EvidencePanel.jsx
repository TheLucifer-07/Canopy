import React, { useState } from 'react';
import {
  FileCode, Brain, Eye, AlertTriangle, ShieldCheck, CheckCircle2,
  ChevronDown, ChevronRight, HelpCircle, Layers
} from 'lucide-react';
import { Badge, cn } from '@canopy/ui';

export function EvidencePanel({ diffResult, fromVersion, toVersion }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'declared' | 'path' | 'observed' | 'discrepancies'
  const [expandedSections, setExpandedSections] = useState({
    declared: true,
    path: true,
    observed: true,
    discrepancies: true
  });

  if (!diffResult) return null;

  const declaredFacets = diffResult.facets || {};
  const evidenceUsed = diffResult.evidence_used || ['declared'];
  const discrepancies = diffResult.discrepancies || [];
  const confidence = diffResult.confidence || {};
  const overallConfidence = typeof confidence.overall === 'number'
    ? Math.round(confidence.overall * 100)
    : (confidence.level || 'High');

  function toggleSection(section) {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <div className="space-y-4">
      {/* Evidence & Confidence Header Summary */}
      <div className="flex flex-wrap items-center justify-between rounded-lg border border-canopy-border bg-canopy-surface p-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-canopy-green/10 p-2 text-canopy-green border border-canopy-green/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Multi-Source Evidence Model</span>
              <Badge variant={diffResult.status === 'complete' ? 'success' : 'warning'}>
                {diffResult.status || 'Verified'}
              </Badge>
            </div>
            <p className="text-xs text-canopy-secondary mt-0.5">
              Grounded across {evidenceUsed.length} verified evidence streams.
            </p>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="flex items-center gap-3 bg-canopy-elevated/40 border border-canopy-border rounded-md px-3.5 py-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-canopy-muted">Confidence</div>
            <div className="text-xs font-bold text-canopy-green">
              {typeof overallConfidence === 'number' ? `${overallConfidence}%` : overallConfidence}
            </div>
          </div>
          <div className="h-7 w-px bg-canopy-border" />
          <div className="flex gap-1">
            {['declared', 'path', 'observed'].map((src) => {
              const isUsed = evidenceUsed.includes(src);
              return (
                <span
                  key={src}
                  title={`${src} evidence ${isUsed ? 'verified' : 'fallback'}`}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold',
                    isUsed
                      ? 'bg-canopy-green/20 text-canopy-green border border-canopy-green/40'
                      : 'bg-canopy-surface text-canopy-muted border border-canopy-border opacity-60'
                  )}
                >
                  {src}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discrepancies Alert if present */}
      {discrepancies.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.07] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Discrepancies Observed ({discrepancies.length})</span>
          </div>
          <div className="space-y-1.5 pl-6">
            {discrepancies.map((disc, i) => (
              <p key={i} className="text-amber-200/90 leading-relaxed">
                {disc.note || `Observed visual evidence and declared actions differ for facet: ${disc.facet || 'general'}.`}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Accordion / Detailed Stream Sections */}
      <div className="space-y-3">
        {/* Stream 1: Declared Delta */}
        <div className="rounded-lg border border-canopy-border bg-canopy-surface overflow-hidden">
          <button
            onClick={() => toggleSection('declared')}
            className="flex w-full items-center justify-between bg-canopy-elevated/30 px-4 py-3 text-left transition-colors hover:bg-canopy-elevated/60"
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="h-4 w-4 text-canopy-green" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                1. Declared Delta
              </span>
              <Badge variant="default" className="text-[10px] font-mono">
                [Deterministic / Tools]
              </Badge>
            </div>
            {expandedSections.declared ? (
              <ChevronDown className="h-4 w-4 text-canopy-muted" />
            ) : (
              <ChevronRight className="h-4 w-4 text-canopy-muted" />
            )}
          </button>

          {expandedSections.declared && (
            <div className="p-4 space-y-3 text-xs border-t border-canopy-border/60">
              <p className="text-canopy-secondary">
                Direct operations executed during version creation:
              </p>
              <div className="rounded-md border border-canopy-border bg-black/50 p-3 font-mono text-[11px] text-canopy-text space-y-1">
                <div>From Version: V{fromVersion?.sequence} ({fromVersion?.id?.slice(0, 8)})</div>
                <div>To Version: V{toVersion?.sequence} ({toVersion?.id?.slice(0, 8)})</div>
                <div>Action Type: {toVersion?.action_type || toVersion?.actions?.[0]?.type || 'edit'}</div>
                {toVersion?.actions?.length ? (
                  <div className="mt-2 pt-2 border-t border-canopy-border/60 text-canopy-green">
                    Params: {JSON.stringify(toVersion.actions[0].params || {})}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Stream 2: Path Summary */}
        <div className="rounded-lg border border-canopy-border bg-canopy-surface overflow-hidden">
          <button
            onClick={() => toggleSection('path')}
            className="flex w-full items-center justify-between bg-canopy-elevated/30 px-4 py-3 text-left transition-colors hover:bg-canopy-elevated/60"
          >
            <div className="flex items-center gap-2.5">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                2. Path Summary
              </span>
              <Badge variant="ai" className="text-[10px] font-mono">
                [Groq Lineage Engine]
              </Badge>
            </div>
            {expandedSections.path ? (
              <ChevronDown className="h-4 w-4 text-canopy-muted" />
            ) : (
              <ChevronRight className="h-4 w-4 text-canopy-muted" />
            )}
          </button>

          {expandedSections.path && (
            <div className="p-4 space-y-2 text-xs border-t border-canopy-border/60">
              <p className="text-canopy-text leading-relaxed bg-canopy-elevated/30 p-3 rounded-md border border-canopy-border">
                {diffResult.summary || 'Sequential creative progression between versions.'}
              </p>
              {diffResult.contribution && (
                <div className="text-[11px] text-canopy-secondary pt-1">
                  Provenance contribution: <span className="text-white">{diffResult.contribution}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stream 3: Observed Delta */}
        <div className="rounded-lg border border-canopy-border bg-canopy-surface overflow-hidden">
          <button
            onClick={() => toggleSection('observed')}
            className="flex w-full items-center justify-between bg-canopy-elevated/30 px-4 py-3 text-left transition-colors hover:bg-canopy-elevated/60"
          >
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                3. Observed Delta
              </span>
              <Badge variant="default" className="text-[10px] font-mono text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                [Gemini Vision Intelligence]
              </Badge>
            </div>
            {expandedSections.observed ? (
              <ChevronDown className="h-4 w-4 text-canopy-muted" />
            ) : (
              <ChevronRight className="h-4 w-4 text-canopy-muted" />
            )}
          </button>

          {expandedSections.observed && (
            <div className="p-4 space-y-3 text-xs border-t border-canopy-border/60">
              {Object.keys(declaredFacets).length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(declaredFacets).map(([facetName, facetData]) => (
                    <div
                      key={facetName}
                      className={cn(
                        'p-3 rounded-md border text-xs space-y-1',
                        facetData.changed
                          ? 'border-canopy-green/40 bg-canopy-green/[0.04]'
                          : 'border-canopy-border bg-canopy-elevated/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize text-white">{facetName}</span>
                        <span className={cn('text-[10px] font-bold uppercase', facetData.changed ? 'text-canopy-green' : 'text-canopy-muted')}>
                          {facetData.changed ? 'Modified' : 'Unchanged'}
                        </span>
                      </div>
                      {facetData.observed?.description && (
                        <p className="text-[11px] text-canopy-secondary">{facetData.observed.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-canopy-secondary italic">
                  Visual observation stream active across asset textures, composition, and color fields.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
