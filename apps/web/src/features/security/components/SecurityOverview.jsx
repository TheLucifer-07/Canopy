import React from 'react';
import { Shield, Key, Lock, AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { formatRelativeTime } from '../../workspace/services/workspaceData.js';

export function SecurityOverview({ security, onSelectTab }) {
  const account = security?.account || {};
  const session = security?.session || {};
  const apiTokens = security?.api_tokens || {};
  const twoFactor = security?.two_factor || {};
  const oauth = security?.oauth || {};
  const password = security?.password || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Security Posture</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Review your authenticated session, credential isolation, machine access tokens, and security boundaries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Account Authentication */}
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">Account Identity</span>
            <Shield className="h-4 w-4 text-canopy-green" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white truncate">{account.email || 'Authenticated User'}</div>
            <div className="text-[11px] text-canopy-muted font-mono mt-0.5">JWT Bearer • Active</div>
          </div>
          <div className="pt-2 border-t border-canopy-border/40 text-[11px] text-canopy-secondary">
            Primary user credential verified
          </div>
        </div>

        {/* Sessions */}
        <button
          type="button"
          onClick={() => onSelectTab && onSelectTab('sessions')}
          className="text-left rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 space-y-3 transition hover:border-canopy-border/80 hover:bg-canopy-surface/80"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">Sessions</span>
            <Lock className="h-4 w-4 text-canopy-green" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">1 Active Session</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">Current device bearer token</div>
          </div>
          <div className="pt-2 border-t border-canopy-border/40 text-[11px] text-canopy-green font-medium">
            Manage active session →
          </div>
        </button>

        {/* API Tokens */}
        <button
          type="button"
          onClick={() => onSelectTab && onSelectTab('tokens')}
          className="text-left rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 space-y-3 transition hover:border-canopy-border/80 hover:bg-canopy-surface/80"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">API Access</span>
            <Key className="h-4 w-4 text-canopy-green" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{apiTokens.active_count ?? 0} Active PAT Tokens</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">{apiTokens.total_count ?? 0} total generated</div>
          </div>
          <div className="pt-2 border-t border-canopy-border/40 text-[11px] text-canopy-green font-medium">
            Manage machine tokens →
          </div>
        </button>

        {/* Password Security */}
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">Password Security</span>
            <CheckCircle className="h-4 w-4 text-canopy-green" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Bcrypt Salted Hash</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">Protected in PostgreSQL</div>
          </div>
          <div className="pt-2 border-t border-canopy-border/40 text-[11px] text-canopy-secondary">
            Encrypted credential storage
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <button
          type="button"
          onClick={() => onSelectTab && onSelectTab('2fa')}
          className="text-left rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 space-y-3 transition hover:border-canopy-border/80 hover:bg-canopy-surface/80"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">Two-Factor (2FA)</span>
            <span className="rounded-full border border-amber-900/40 bg-amber-950/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              Not Configured
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Single-Factor JWT</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">TOTP/WebAuthn unavailable</div>
          </div>
          <div className="pt-2 border-t border-canopy-border/40 text-[11px] text-canopy-secondary">
            View 2FA capabilities →
          </div>
        </button>

        {/* OAuth Integrations */}
        <button
          type="button"
          onClick={() => onSelectTab && onSelectTab('oauth')}
          className="text-left rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 space-y-3 transition hover:border-canopy-border/80 hover:bg-canopy-surface/80"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">OAuth Connections</span>
            <span className="rounded-full border border-canopy-border bg-canopy-elevated px-2 py-0.5 text-[10px] font-semibold text-canopy-muted">
              None
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">0 Connected Providers</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">Direct authentication only</div>
          </div>
          <div className="pt-2 border-t border-canopy-border/40 text-[11px] text-canopy-secondary">
            View OAuth status →
          </div>
        </button>
      </div>

      {/* Security Invariants & Boundaries */}
      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-canopy-muted">
          Active Security Boundaries & Guarantees
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg border border-canopy-border bg-canopy-elevated/40 p-3.5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span className="text-canopy-green">✓</span> Strict User & Tenant Isolation
            </div>
            <p className="text-canopy-secondary text-[11px] leading-relaxed">
              Identity is derived strictly from verified JWT tokens. Client-supplied user IDs in request bodies are ignored.
            </p>
          </div>

          <div className="rounded-lg border border-canopy-border bg-canopy-elevated/40 p-3.5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span className="text-canopy-green">✓</span> Secret Leakage Protection
            </div>
            <p className="text-canopy-secondary text-[11px] leading-relaxed">
              Database URLs, JWT secrets, AI provider keys (Gemini/Groq), and token hashes are never exposed to clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
