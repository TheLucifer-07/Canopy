import React, { useState } from 'react';
import { ArrowLeft, Download, ExternalLink, GitBranch, GitCommit, Image as ImageIcon, Calendar, HardDrive, Hash, Layers } from 'lucide-react';
import { Button, Badge, PropertyRow, cn } from '@canopy/ui';
import { VersionCompareModal } from '../../diff/index.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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

export function AssetViewer({ api, projectId, asset, onBack, onOpenWorkbench }) {
  const [compareVersionId, setCompareVersionId] = useState(null);
  if (!asset) return null;

  const relatedVersions = asset.related_versions || [];

  function handleDownload() {
    if (!asset.url) return;
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = `canopy-asset-${asset.id.slice(0, 8)}.${asset.mime?.split('/')[1] || 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] border border-canopy-border bg-canopy-surface rounded-lg overflow-hidden">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-canopy-border bg-canopy-elevated/40 px-5 py-3.5 gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-canopy-secondary hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Button>
          <div className="h-4 w-px bg-canopy-border" />
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-canopy-green" />
            <span className="text-sm font-semibold text-white">Asset {asset.id.slice(0, 8)}</span>
            <Badge variant="default" className="text-[10px]">{asset.mime}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-4 w-4" />
            Download Asset
          </Button>
          {onOpenWorkbench && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenWorkbench({ assetId: asset.id })}
              className="gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Workbench
            </Button>
          )}
        </div>
      </div>

      {/* Main viewer split pane */}
      <div className="grid flex-1 lg:grid-cols-[1fr_340px] overflow-hidden">
        {/* Canvas / Image Display */}
        <div className="relative flex items-center justify-center p-8 bg-black/60 overflow-auto border-b lg:border-b-0 lg:border-r border-canopy-border">
          {asset.url ? (
            <img
              src={asset.url}
              alt={`Asset ${asset.id}`}
              className="max-h-[550px] max-w-full rounded border border-canopy-border/50 object-contain shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-canopy-muted p-12">
              <ImageIcon className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">No preview URL available for this asset.</p>
            </div>
          )}
        </div>

        {/* Metadata & Related Versions Inspector */}
        <div className="flex flex-col overflow-y-auto bg-canopy-surface p-5 space-y-6">
          {/* Metadata Section */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-canopy-green" />
              Asset Metadata
            </div>
            <div className="space-y-3 rounded-md border border-canopy-border bg-canopy-elevated/30 p-3.5 text-xs">
              <PropertyRow label="Asset ID" value={asset.id} mono />
              <PropertyRow label="MIME Type" value={asset.mime} />
              <PropertyRow label="File Size" value={formatBytes(asset.byte_size)} />
              {asset.width && asset.height && (
                <PropertyRow label="Dimensions" value={`${asset.width} × ${asset.height} px`} />
              )}
              <PropertyRow label="Content Hash (SHA-256)" value={asset.content_hash} mono />
              <PropertyRow label="Created Date" value={formatDate(asset.created_at)} />
            </div>
          </section>

          {/* Related Versions Section */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-canopy-green" />
                Related Versions ({relatedVersions.length})
              </span>
            </div>

            {relatedVersions.length > 0 ? (
              <div className="space-y-2">
                {relatedVersions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md border border-canopy-border bg-canopy-elevated/40 p-3 text-xs transition-colors hover:border-canopy-green/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canopy-green/10 text-[10px] font-bold text-canopy-green border border-canopy-green/30">
                        V{v.sequence}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {v.label || `Version ${v.sequence}`}
                        </div>
                        <div className="text-[11px] text-canopy-secondary">
                          {v.action_type || 'edit'} · {formatDate(v.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {api && projectId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCompareVersionId(v.id)}
                          className="h-7 px-2 text-[11px] text-canopy-secondary hover:text-white"
                        >
                          Compare
                        </Button>
                      )}
                      {onOpenWorkbench && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenWorkbench({ versionId: v.id })}
                          className="h-7 px-2 text-[11px] text-canopy-green hover:text-white"
                        >
                          Open
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-canopy-border/60 bg-canopy-elevated/20 p-4 text-center text-xs text-canopy-secondary">
                <Layers className="h-5 w-5 text-canopy-muted mx-auto mb-1.5 opacity-60" />
                No versions currently reference this asset directly.
              </div>
            )}
          </section>
        </div>
      </div>

      {compareVersionId && api && projectId && (
        <VersionCompareModal
          api={api}
          projectId={projectId}
          versions={relatedVersions}
          initialToVersionId={compareVersionId}
          isOpen={Boolean(compareVersionId)}
          onClose={() => setCompareVersionId(null)}
          onOpenWorkbench={onOpenWorkbench}
        />
      )}
    </div>
  );
}
