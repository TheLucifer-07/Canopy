import React from 'react';
import { Laptop, ShieldCheck, LogOut, Info, Lock } from 'lucide-react';
import { Button } from '@canopy/ui';

export function SessionsSection({ security, onSignOut }) {
  const account = security?.account || {};
  const session = security?.session || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Active Sessions</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Inspect your active authenticated session, bearer token parameters, and device connection state.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg border border-canopy-border bg-canopy-elevated text-canopy-green shrink-0">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Current Web Session</h3>
                <span className="rounded-full border border-canopy-green/30 bg-canopy-green/10 px-2 py-0.5 text-[10px] font-semibold text-canopy-green flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-canopy-green animate-pulse" />
                  Active Now
                </span>
              </div>
              <p className="text-xs text-canopy-secondary mt-1">
                Authenticated as <span className="text-white font-medium">{account.email || 'Current User'}</span> via signed JWT bearer token.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="rounded-md border border-canopy-border bg-canopy-elevated px-2 py-0.5 text-canopy-muted">
                  Auth: JWT (HMAC-SHA256)
                </span>
                <span className="rounded-md border border-canopy-border bg-canopy-elevated px-2 py-0.5 text-canopy-muted">
                  TTL: 7 Days (604,800s)
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 border border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white shrink-0 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-canopy-border/60 bg-canopy-surface/30 p-5 space-y-2">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-canopy-muted shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-white">
              Multi-Device Session Management
            </h4>
            <p className="text-xs text-canopy-secondary leading-relaxed">
              Advanced multi-device session tracking and remote session revocation are not configured in this prototype deployment. Logging out clears and destroys the local bearer token from storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
