import React, { useState } from 'react';
import { SecurityOverview } from '../../security/components/SecurityOverview.jsx';
import { SessionsSection } from '../../security/components/SessionsSection.jsx';
import { ApiTokensSection } from '../../security/components/ApiTokensSection.jsx';
import { OAuthSection } from '../../security/components/OAuthSection.jsx';
import { TwoFactorSection } from '../../security/components/TwoFactorSection.jsx';
import { useSecurity } from '../../security/hooks/useSecurity.js';
import { LoadingState, ErrorState } from '@canopy/ui';

export function SecuritySettings({ api, onSignOut }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { security, isLoading, error } = useSecurity(api);

  if (isLoading) {
    return <LoadingState label="Loading security parameters..." className="py-12" />;
  }

  if (error) {
    return <ErrorState message={error.message || 'Could not load security status.'} />;
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-canopy-border pb-3">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'sessions', label: 'Sessions' },
          { id: 'tokens', label: 'API Tokens' },
          { id: 'oauth', label: 'OAuth' },
          { id: '2fa', label: 'Two-Factor (2FA)' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === tab.id
                ? 'bg-canopy-elevated text-white font-semibold border border-canopy-border'
                : 'text-canopy-secondary hover:text-white hover:bg-canopy-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <SecurityOverview security={security} onSelectTab={setActiveTab} />
      )}

      {activeTab === 'sessions' && (
        <SessionsSection security={security} onSignOut={onSignOut} />
      )}

      {activeTab === 'tokens' && (
        <ApiTokensSection api={api} />
      )}

      {activeTab === 'oauth' && (
        <OAuthSection />
      )}

      {activeTab === '2fa' && (
        <TwoFactorSection />
      )}
    </div>
  );
}
