import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Upload, Search, Grid, List, Image as ImageIcon,
  ExternalLink, Download, GitBranch, Filter, HardDrive, Calendar
} from 'lucide-react';
import { Button, Badge, Input, EmptyState, LoadingState, ErrorState, cn } from '@canopy/ui';
import { AssetUploadModal } from './AssetUploadModal.jsx';
import { AssetViewer } from './AssetViewer.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function AssetBrowser({ api, projectId, onOpenWorkbench }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mimeFilter, setMimeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const assetsQuery = useQuery({
    queryKey: ['project-assets', projectId],
    queryFn: () => api.listProjectAssets(projectId),
    enabled: Boolean(projectId)
  });

  const assets = assetsQuery.data?.assets || [];

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = !searchQuery ||
        asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.content_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.mime.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMime = mimeFilter === 'all' || asset.mime.includes(mimeFilter);

      return matchesSearch && matchesMime;
    });
  }, [assets, searchQuery, mimeFilter]);

  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  if (selectedAsset) {
    return (
      <AssetViewer
        api={api}
        projectId={projectId}
        asset={selectedAsset}
        onBack={() => setSelectedAssetId(null)}
        onOpenWorkbench={onOpenWorkbench}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top summary & action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-canopy-border pb-5">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <ImageIcon className="h-5 w-5 text-canopy-green" />
            Creative Assets
          </h2>
          <p className="mt-1 text-xs text-canopy-secondary">
            Manage, inspect, and connect creative files across project version history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* Filter and view controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
            <Input
              type="text"
              placeholder="Search by Asset ID or hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* MIME Filter pills */}
          <div className="flex rounded-md border border-canopy-border bg-canopy-surface p-0.5 text-xs">
            {['all', 'png', 'jpeg', 'webp'].map((m) => (
              <button
                key={m}
                onClick={() => setMimeFilter(m)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs uppercase font-medium transition-colors',
                  mimeFilter === m
                    ? 'bg-canopy-green/20 text-canopy-green font-semibold'
                    : 'text-canopy-secondary hover:text-white'
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-md border border-canopy-border bg-canopy-surface p-0.5 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-canopy-elevated text-white'
                  : 'text-canopy-muted hover:text-white'
              )}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-canopy-elevated text-white'
                  : 'text-canopy-muted hover:text-white'
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Query state rendering */}
      {assetsQuery.isLoading ? (
        <LoadingState label="Loading creative assets..." />
      ) : assetsQuery.isError ? (
        <ErrorState
          message={assetsQuery.error?.message || 'Failed to load project assets.'}
          retry={() => assetsQuery.refetch()}
        />
      ) : filteredAssets.length === 0 ? (
        assets.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-10 w-10 text-canopy-green opacity-80" />}
            title="No creative assets yet"
            description="Upload your first creative asset to begin tracking versions, lineage, and evolution."
            action={
              <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Asset
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No matching assets"
            description="Try changing your search query or filter."
          />
        )
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredAssets.map((asset) => {
            const relVersions = asset.related_versions || [];
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAssetId(asset.id)}
                className="group flex flex-col justify-between rounded-lg border border-canopy-border bg-canopy-surface overflow-hidden cursor-pointer transition-all duration-150 hover:border-canopy-green/60 hover:shadow-lg"
              >
                {/* Image preview */}
                <div className="relative aspect-video w-full bg-black/40 overflow-hidden flex items-center justify-center border-b border-canopy-border">
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={`Asset ${asset.id}`}
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-canopy-muted opacity-40" />
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="text-[10px] bg-black/70 backdrop-blur-sm border-canopy-border">
                      {asset.mime.split('/')[1]?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Card footer details */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-white truncate max-w-[140px]">
                      {asset.id.slice(0, 8)}...
                    </span>
                    <span className="text-canopy-muted text-[11px]">
                      {formatBytes(asset.byte_size)}
                    </span>
                  </div>

                  {/* Related versions badges */}
                  <div className="flex items-center justify-between pt-1 border-t border-canopy-border/60 text-[11px]">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <GitBranch className="h-3 w-3 text-canopy-green shrink-0" />
                      {relVersions.length > 0 ? (
                        <div className="flex items-center gap-1 truncate">
                          {relVersions.slice(0, 3).map((v) => (
                            <span
                              key={v.id}
                              className="rounded bg-canopy-green/10 px-1 py-0.2 text-[10px] font-semibold text-canopy-green border border-canopy-green/20"
                            >
                              V{v.sequence}
                            </span>
                          ))}
                          {relVersions.length > 3 && (
                            <span className="text-[10px] text-canopy-muted">+{relVersions.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-canopy-muted text-[10px]">No versions</span>
                      )}
                    </div>

                    <span className="text-canopy-muted text-[10px]">
                      {formatDate(asset.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-canopy-border bg-canopy-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-canopy-border bg-canopy-elevated/40 text-canopy-muted uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Related Versions</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canopy-border">
                {filteredAssets.map((asset) => {
                  const relVersions = asset.related_versions || [];
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className="hover:bg-canopy-elevated/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded bg-black/60 border border-canopy-border flex items-center justify-center overflow-hidden shrink-0">
                            {asset.url ? (
                              <img src={asset.url} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-canopy-muted" />
                            )}
                          </div>
                          <div>
                            <div className="font-mono font-medium text-white">{asset.id.slice(0, 12)}...</div>
                            <div className="text-[10px] text-canopy-muted font-mono">{asset.content_hash.slice(0, 16)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" className="text-[10px]">{asset.mime}</Badge>
                      </td>
                      <td className="px-4 py-3 text-canopy-secondary">
                        {formatBytes(asset.byte_size)}
                      </td>
                      <td className="px-4 py-3">
                        {relVersions.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {relVersions.map((v) => (
                              <span
                                key={v.id}
                                className="rounded bg-canopy-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-canopy-green border border-canopy-green/20"
                              >
                                V{v.sequence}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-canopy-muted text-[11px]">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-canopy-secondary">
                        {formatDate(asset.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssetId(asset.id);
                          }}
                          className="h-7 px-2.5 text-xs text-canopy-green hover:text-white"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload modal */}
      <AssetUploadModal
        projectId={projectId}
        api={api}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={(newAsset) => {
          setSelectedAssetId(newAsset.id);
        }}
      />
    </div>
  );
}
