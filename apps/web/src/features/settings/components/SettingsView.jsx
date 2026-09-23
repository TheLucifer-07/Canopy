import React, { useState } from 'react';
import {
  User, Palette, Sliders, Shield, Key, Sparkles, Network, AlertCircle
} from 'lucide-react';
import { LoadingState, ErrorState } from '@canopy/ui';
import { useSettings } from '../hooks/useSettings.js';
import { AccountSettings } from './AccountSettings.jsx';
import { AppearanceSettings } from './AppearanceSettings.jsx';
import { PreferencesSettings } from './PreferencesSettings.jsx';
import { SecuritySettings } from './SecuritySettings.jsx';
import { ApiTokensSettings } from './ApiTokensSettings.jsx';
import { AiSettings } from './AiSettings.jsx';
import { ConnectedServicesSettings } from './ConnectedServicesSettings.jsx';

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User, desc: 'Identity & workspace profile' },
  { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme, density & motion' },
  { id: 'preferences', label: 'Preferences', icon: Sliders, desc: 'Workspaces & activity defaults' },
  { id: 'security', label: 'Security', icon: Shield, desc: 'Session & credential isolation' },
  { id: 'tokens', label: 'API Tokens', icon: Key, desc: 'PAT credentials for MCP' },
  { id: 'ai', label: 'AI Settings', icon: Sparkles, desc: 'Copilot style & Semantic Diff' },
  { id: 'services', label: 'Connected Services', icon: Network, desc: 'MCP & protocol status' },
];

export function SettingsView({ api, onSignOut, onNavigateToDevelopers, defaultSection = 'account' }) {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const { settings, isLoading, error, updateSettings, isUpdating, updateError } = useSettings(api);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-canopy-secondary mt-1">
          Manage your Canopy creator profile, creative workspace preferences, and developer credentials.
        </p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading Canopy settings..." className="py-16" />
      ) : error ? (
        <ErrorState message={error.message || 'Failed to load user settings.'} />
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
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? (section.id === 'ai' ? 'text-purple-400' : 'text-canopy-green') : 'text-canopy-muted'}`} />
                  <div className="text-left">
                    <div className="truncate">{section.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Main Settings Panel */}
          <main className="lg:col-span-9 space-y-6">
            {updateError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{updateError.message || 'Failed to update settings.'}</span>
              </div>
            )}

            {activeSection === 'account' && (
              <AccountSettings settings={settings} onSignOut={onSignOut} />
            )}

            {activeSection === 'appearance' && (
              <AppearanceSettings
                settings={settings}
                onUpdate={updateSettings}
                isUpdating={isUpdating}
              />
            )}

            {activeSection === 'preferences' && (
              <PreferencesSettings
                settings={settings}
                onUpdate={updateSettings}
                isUpdating={isUpdating}
              />
            )}

            {activeSection === 'security' && (
              <SecuritySettings api={api} settings={settings} onSignOut={onSignOut} />
            )}

            {activeSection === 'tokens' && (
              <ApiTokensSettings api={api} />
            )}

            {activeSection === 'ai' && (
              <AiSettings
                settings={settings}
                onUpdate={updateSettings}
                isUpdating={isUpdating}
              />
            )}

            {activeSection === 'services' && (
              <ConnectedServicesSettings onNavigateToDevelopers={onNavigateToDevelopers} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
