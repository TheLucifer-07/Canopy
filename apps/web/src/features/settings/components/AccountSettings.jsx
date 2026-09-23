import React from 'react';
import { User, Mail, ShieldCheck, Calendar, LogOut } from 'lucide-react';
import { Button } from '@canopy/ui';
import { formatRelativeTime } from '../../workspace/services/workspaceData.js';

export function AccountSettings({ settings, onSignOut }) {
  const account = settings?.account || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Account Details</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Review your account identity, security status, and primary workspace ownership.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
              Account Email
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2.5 text-sm text-white">
              <Mail className="h-4 w-4 text-canopy-green shrink-0" />
              <span className="truncate">{account.email || 'user@canopy.design'}</span>
            </div>
            <p className="mt-1 text-[11px] text-canopy-muted">Primary account email used for authentication.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
              Username Handle
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2.5 text-sm text-white font-mono">
              <span className="text-canopy-green">@</span>
              <span className="truncate">{account.username || 'canopy_user'}</span>
            </div>
            <p className="mt-1 text-[11px] text-canopy-muted">Public handle across lineage DAGs and projects.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 pt-4 border-t border-canopy-border/50">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1">
              Account Status
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-canopy-green/30 bg-canopy-green/10 px-2.5 py-1 text-xs font-semibold text-canopy-green">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Active Creator</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1">
              Member Since
            </span>
            <div className="flex items-center gap-1.5 text-xs text-canopy-secondary font-mono mt-1">
              <Calendar className="h-3.5 w-3.5 text-canopy-muted" />
              <span>{account.created_at ? formatRelativeTime(account.created_at) : 'Active'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-rose-300">Sign Out</h3>
          <p className="text-xs text-canopy-secondary mt-0.5">End your current authenticated session on this device.</p>
        </div>
        <Button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 border border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white shrink-0"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </Button>
      </div>
    </div>
  );
}
