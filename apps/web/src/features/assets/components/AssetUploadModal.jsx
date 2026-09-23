import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button, cn } from '@canopy/ui';

const SUPPORTED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function AssetUploadModal({ projectId, api, isOpen, onClose, onUploaded }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: (file) => api.uploadAsset(projectId, file),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['lineage', projectId] });
      if (onUploaded) onUploaded(asset);
      handleClose();
    },
    onError: (err) => {
      setError(err?.message || 'Failed to upload asset.');
    }
  });

  if (!isOpen) return null;

  function handleFileSelect(file) {
    setError(null);
    if (!file) return;

    if (!SUPPORTED_MIMES.includes(file.type)) {
      setError('Only PNG, JPEG, and WebP images are supported.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('File exceeds the 50MB maximum upload limit.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleClose() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    onClose();
  }

  function handleUpload() {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-lg border border-canopy-border bg-canopy-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-canopy-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-canopy-green" />
            <h3 className="text-base font-semibold text-white">Upload Creative Asset</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="rounded p-1 text-canopy-muted hover:bg-canopy-elevated hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150',
                dragActive
                  ? 'border-canopy-green bg-canopy-green/10'
                  : 'border-canopy-border bg-canopy-elevated/30 hover:border-canopy-green/50 hover:bg-canopy-elevated/60'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div className="rounded-full bg-canopy-elevated p-3 text-canopy-green mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-white">
                Drag and drop your creative image here, or <span className="text-canopy-green underline">browse</span>
              </p>
              <p className="mt-1.5 text-xs text-canopy-secondary">
                Supported formats: PNG, JPEG, WebP (up to 50MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-canopy-border bg-black/50 flex items-center justify-center">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Asset preview"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between rounded-md border border-canopy-border bg-canopy-elevated/40 p-3 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <ImageIcon className="h-4 w-4 text-canopy-green shrink-0" />
                  <span className="truncate font-medium text-white">{selectedFile.name}</span>
                </div>
                <span className="text-canopy-muted shrink-0 ml-2">{formatBytes(selectedFile.size)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-canopy-border bg-canopy-elevated/20 px-5 py-3.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          {selectedFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              disabled={uploadMutation.isPending}
            >
              Choose different file
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading asset...
              </>
            ) : (
              'Upload Asset'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
