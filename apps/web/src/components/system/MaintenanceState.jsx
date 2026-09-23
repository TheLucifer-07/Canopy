import React from 'react';
import { Wrench, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@canopy/ui';

export function MaintenanceState({
  title = 'System Maintenance',
  description = 'Canopy is temporarily undergoing scheduled database and infrastructure maintenance. Please try again shortly.',
  onCheckStatus = null,
  className = ''
}) {
  const handleReload = () => {
    if (onCheckStatus) {
      onCheckStatus();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={`mx-auto max-w-lg p-8 text-center rounded-xl border border-amber-900/40 bg-amber-950/10 space-y-4 my-12 ${className}`}>
      <div className="inline-flex p-3 rounded-full border border-amber-900/40 bg-amber-950/30 text-amber-400 mb-1">
        <Wrench className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-canopy-secondary mt-1.5 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300/80">
        <Clock className="h-3.5 w-3.5 text-amber-400" />
        <span>Core database and lineage services will resume shortly</span>
      </div>

      <div className="flex justify-center pt-3">
        <Button
          type="button"
          onClick={handleReload}
          className="text-xs inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold border-amber-500"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Check Status / Reload</span>
        </Button>
      </div>
    </div>
  );
}
