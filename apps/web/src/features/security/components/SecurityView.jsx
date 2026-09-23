import React, { useState } from 'react';
import { Shield, Lock, Key, Network, Smartphone, AlertCircle } from 'lucide-react';
import { LoadingState, ErrorState } from '@canopy/ui';
import { useSecurity } from '../hooks/useSecurity.js';
import { SecurityOverview } from './SecurityOverview.jsx';
import { SessionsSection } from './SessionsSection.jsx';
import { ApiTokensSection } from './ApiTokensSection.jsx';
import { OAuthSection } from './OAuthSection.jsx';
import { TwoFactorSection } from './TwoFactorSection.jsx';

const SECTIONS = [
  { id: 'overview', label: 'Security Overview', icon: Shield, desc: 'Posture & active controls' },
  { id: 'sessions', label: 'Sessions', icon: Lock, desc: 'Active JWT bearer session' },
  { id: 'tokens', label: 'API Tokens (PAT)', icon: Key, desc: 'Machine access credentials' },
  { id: 'oauth', label: 'OAuth Connections', icon: Network, desc: 'External identity providers' },
  { id: '2fa', label: 'Two-Factor (2FA)', icon: Smartphone, desc: 'Multi-factor authentication' },
];

export function SecurityView({ api, onSignOut, defaultSection = 'overview' }) {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const { security, isLoading, error } = useSecurity(api);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Security</h1>
        <p className="text-sm text-canopy-secondary mt-1">
          Inspect authentication parameters, active bearer sessions, machine tokens, and platform security boundaries.
        </p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading security parameters..." className="py-16" />
      ) : error ? (
        <ErrorState message={error.message || 'Failed to load security status.'} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <nav className="lg:col-span-3 space-y-1 rounded-xl border border-canopy-border bg-canopy-surface/40 p-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? 'border border-canopy-border bg-canopy-elevated text-white font-semibold shadow-sm'
                      : 'text-canopy-secondary hover:bg-canopy-surface/80 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-canopy-green' : 'text-canopy-muted'}`} />
                  <div className="text-left">
                    <div className="truncate">{section.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Main Security Panel */}
          <main className="lg:col-span-9 space-y-6">
            {activeSection === 'overview' && (
              <SecurityOverview security={security} onSelectTab={setActiveSection} />
            )}

            {activeSection === 'sessions' && (
              <SessionsSection security={security} onSignOut={onSignOut} />
            )}

            {activeSection === 'tokens' && (
              <ApiTokensSection api={api} />
            )}

            {activeSection === 'oauth' && (
              <OAuthSection />
            )}

            {activeSection === '2fa' && (
              <TwoFactorSection />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
