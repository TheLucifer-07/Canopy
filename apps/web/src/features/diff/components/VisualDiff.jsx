import React, { useState } from 'react';
import { Columns, Eye, Layers, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Badge, Button, LoadingState, cn } from '@canopy/ui';

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function VisualDiff({
  fromVersion,
  toVersion,
  fromAssetUrl,
  toAssetUrl,
  isLoadingAssets = false
}) {
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'slider'
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="flex flex-col rounded-lg border border-canopy-border bg-canopy-surface overflow-hidden">
      {/* Visual Diff Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-canopy-border bg-canopy-elevated/40 px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-canopy-green" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Visual Comparison
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-canopy-border bg-canopy-surface p-0.5 text-xs">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors',
              viewMode === 'side-by-side'
                ? 'bg-canopy-elevated text-white font-medium'
                : 'text-canopy-secondary hover:text-white'
            )}
          >
            <Columns className="h-3.5 w-3.5" />
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors',
              viewMode === 'slider'
                ? 'bg-canopy-elevated text-white font-medium'
                : 'text-canopy-secondary hover:text-white'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Split Slider
          </button>
        </div>
      </div>

      {/* Visual Canvas */}
      {isLoadingAssets ? (
        <div className="p-16">
          <LoadingState label="Loading compared creative assets..." />
        </div>
      ) : viewMode === 'side-by-side' ? (
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-canopy-border bg-black/60">
          {/* Version A (Base) */}
          <div className="flex flex-col p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-canopy-surface px-2 py-0.5 text-xs font-mono font-bold text-canopy-secondary border border-canopy-border">
                  V{fromVersion?.sequence || '?'}
                </span>
                <span className="text-xs font-semibold text-white">
                  {fromVersion?.label || fromVersion?.action_type || 'Base Version'}
                </span>
              </div>
              <Badge variant={fromVersion?.actor_type === 'model' ? 'model' : 'human'}>
                {fromVersion?.actor_type || 'human'}
              </Badge>
            </div>

            <div className="relative aspect-video w-full rounded border border-canopy-border/50 bg-black/80 flex items-center justify-center overflow-hidden">
              {fromAssetUrl ? (
                <img
                  src={fromAssetUrl}
                  alt={`Version ${fromVersion?.sequence}`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-canopy-muted text-xs">
                  <ImageIcon className="h-8 w-8 mb-1.5 opacity-40" />
                  <span>Asset not available</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-canopy-muted">
              <span>{formatDate(fromVersion?.created_at)}</span>
              <span className="font-mono">{fromVersion?.id ? `ID: ${fromVersion.id.slice(0, 8)}` : ''}</span>
            </div>
          </div>

          {/* Version B (Target) */}
          <div className="flex flex-col p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-canopy-green/10 px-2 py-0.5 text-xs font-mono font-bold text-canopy-green border border-canopy-green/30">
                  V{toVersion?.sequence || '?'}
                </span>
                <span className="text-xs font-semibold text-white">
                  {toVersion?.label || toVersion?.action_type || 'Target Version'}
                </span>
              </div>
              <Badge variant={toVersion?.actor_type === 'model' ? 'model' : 'human'}>
                {toVersion?.actor_type || 'human'}
              </Badge>
            </div>

            <div className="relative aspect-video w-full rounded border border-canopy-green/30 bg-black/80 flex items-center justify-center overflow-hidden">
              {toAssetUrl ? (
                <img
                  src={toAssetUrl}
                  alt={`Version ${toVersion?.sequence}`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-canopy-muted text-xs">
                  <ImageIcon className="h-8 w-8 mb-1.5 opacity-40" />
                  <span>Asset not available</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-canopy-muted">
              <span>{formatDate(toVersion?.created_at)}</span>
              <span className="font-mono">{toVersion?.id ? `ID: ${toVersion.id.slice(0, 8)}` : ''}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Split Slider Mode */
        <div className="relative aspect-video w-full max-h-[500px] bg-black/90 overflow-hidden select-none">
          {/* Base image (full background) */}
          {fromAssetUrl && (
            <img
              src={fromAssetUrl}
              alt={`Version ${fromVersion?.sequence}`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {/* Target image (clipped overlay) */}
          {toAssetUrl && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <img
                src={toAssetUrl}
                alt={`Version ${toVersion?.sequence}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          )}

          {/* Divider Line & Handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-canopy-green shadow-[0_0_10px_rgba(46,204,113,0.8)] cursor-ew-resize z-20"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-canopy-green text-black font-bold text-xs flex items-center justify-center shadow-lg pointer-events-none">
              ↔
            </div>
          </div>

          {/* Interactive Range Input Overlay */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
          />

          {/* Corner Badges */}
          <div className="absolute top-3 left-3 z-10">
            <span className="rounded bg-black/80 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white border border-canopy-border">
              V{fromVersion?.sequence} (Base)
            </span>
          </div>
          <div className="absolute top-3 right-3 z-10">
            <span className="rounded bg-black/80 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-canopy-green border border-canopy-green/40">
              V{toVersion?.sequence} (Target)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
