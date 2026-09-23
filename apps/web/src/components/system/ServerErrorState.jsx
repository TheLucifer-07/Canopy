import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@canopy/ui';
import { useNavigate } from 'react-router-dom';

export function ServerErrorState({
  title = 'Server Error',
  description = 'An unexpected server issue prevented Canopy from completing this operation. Our backend services have been alerted.',
  errorId = null,
  onRetry = null,
  onHome = null,
  homeLabel = 'Return to Workspace',
  className = ''
}) {
  const navigate = useNavigate();

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      navigate('/app');
    }
  };

  return (
    <div className={`mx-auto max-w-lg p-8 text-center rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-4 my-12 ${className}`}>
      <div className="inline-flex p-3 rounded-full border border-rose-900/40 bg-rose-950/30 text-rose-400 mb-1">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-canopy-secondary mt-1.5 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
        {errorId && (
          <div className="mt-2 text-[10px] font-mono text-canopy-muted">
            Incident ID: <span className="text-rose-300">{errorId}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            className="text-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={handleHome}
          className="text-xs inline-flex items-center gap-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          <span>{homeLabel}</span>
        </Button>
      </div>
    </div>
  );
}
