import React from 'react';
import { HelpCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@canopy/ui';
import { useNavigate } from 'react-router-dom';

export function NotFoundState({
  title = 'Resource Not Found',
  description = 'The requested project, version, asset, or page could not be located in this workspace.',
  onBack = null,
  onHome = null,
  homeLabel = 'Return to Workspace',
  className = ''
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.length > 1 ? navigate(-1) : navigate('/app');
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      navigate('/app');
    }
  };

  return (
    <div className={`mx-auto max-w-lg p-8 text-center rounded-xl border border-canopy-border bg-canopy-surface/60 space-y-4 my-12 ${className}`}>
      <div className="inline-flex p-3 rounded-full border border-canopy-border bg-canopy-elevated text-canopy-green mb-1">
        <HelpCircle className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-canopy-secondary mt-1.5 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="text-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Go Back</span>
        </Button>
        <Button
          type="button"
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
