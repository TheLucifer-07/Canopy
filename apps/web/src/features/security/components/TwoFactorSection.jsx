import React from 'react';
import { Smartphone, Info, ShieldCheck } from 'lucide-react';

export function TwoFactorSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Two-Factor Authentication (2FA)</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Multi-factor authentication mechanisms and second-factor enforcement.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-8 text-center space-y-3">
        <div className="inline-flex p-3 rounded-full border border-canopy-border bg-canopy-elevated text-amber-400 mb-1">
          <Smartphone className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">Two-Factor Authentication Not Configured</h3>
        <p className="text-xs text-canopy-secondary max-w-md mx-auto leading-relaxed">
          Time-based one-time passwords (TOTP), SMS codes, and WebAuthn hardware security keys are not configured in this prototype deployment.
        </p>
        <div className="pt-2 text-[11px] text-canopy-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-canopy-green" />
          <span>Account protection is enforced via salted bcrypt hashing and cryptographically signed JWT bearer tokens.</span>
        </div>
      </div>
    </div>
  );
}
