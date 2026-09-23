import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@canopy/ui';

export function ErrorState({
  title = 'An error occurred',
  message = null,
  onRetry = null,
  retryLabel = 'Retry',
  className = ''
}) {
  const displayMsg = message || 'Failed to complete the requested operation.';

  return (
    <div className={`flex flex-col gap-4 rounded-md border border-[#F43F5E]/35 bg-[#F43F5E]/10 p-5 text-rose-200 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          {title && <div className="text-xs font-semibold text-white mb-0.5">{title}</div>}
          <div className="text-xs text-rose-200/90 leading-relaxed">{displayMsg}</div>
        </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="shrink-0 border-rose-800/60 hover:bg-rose-900/40 text-rose-200 text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          <span>{retryLabel}</span>
        </Button>
      )}
    </div>
  );
}
