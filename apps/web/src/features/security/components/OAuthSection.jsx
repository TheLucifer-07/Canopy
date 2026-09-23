import React from 'react';
import { Network, Info, ShieldAlert } from 'lucide-react';

export function OAuthSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">OAuth Connections</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Third-party identity and single sign-on (SSO) provider configuration.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-8 text-center space-y-3">
        <div className="inline-flex p-3 rounded-full border border-canopy-border bg-canopy-elevated text-canopy-muted mb-1">
          <Network className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">No Connected OAuth Providers</h3>
        <p className="text-xs text-canopy-secondary max-w-md mx-auto leading-relaxed">
          No external OAuth identity providers (such as GitHub, Google, or Figma) are configured for this Canopy deployment.
        </p>
        <div className="pt-2 text-[11px] text-canopy-muted">
          All creator access is governed authoritatively through Canopy's direct JWT authentication system.
        </div>
      </div>
    </div>
  );
}
