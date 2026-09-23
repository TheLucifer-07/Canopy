import React, { useState, useEffect } from 'react';
import { Sliders, Bell, Layout, Layers, Save } from 'lucide-react';
import { Button } from '@canopy/ui';

export function PreferencesSettings({ settings, onSave, saving }) {
  const [preferences, setPreferences] = useState({
    default_landing: 'dashboard',
    default_asset_view: 'side-by-side',
    notifications_enabled: true,
    activity_stream_density: 'standard'
  });

  useEffect(() => {
    if (settings?.preferences) {
      setPreferences({
        default_landing: settings.preferences.default_landing || 'dashboard',
        default_asset_view: settings.preferences.default_asset_view || 'side-by-side',
        notifications_enabled: settings.preferences.notifications_enabled !== false,
        activity_stream_density: settings.preferences.activity_stream_density || 'standard'
      });
    }
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ preferences });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">General Preferences</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Configure default navigation landing surfaces, asset inspection defaults, and notification triggers.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-6">
        {/* Default Landing */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
            Default Landing Surface
          </label>
          <select
            value={preferences.default_landing}
            onChange={(e) => setPreferences({ ...preferences, default_landing: e.target.value })}
            className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2.5 text-sm text-white focus:border-canopy-green focus:outline-none"
          >
            <option value="dashboard">Creative Workspace (Overview Dashboard)</option>
            <option value="projects">Projects Index (All Creative Projects)</option>
            <option value="activity">Creative Activity Feed</option>
            <option value="saved-items">Saved Items / Bookmarks</option>
          </select>
          <p className="mt-1 text-[11px] text-canopy-muted">Surface displayed immediately after authentication.</p>
        </div>

        {/* Default Asset View */}
        <div className="pt-4 border-t border-canopy-border/50">
          <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
            Default Asset Inspector Mode
          </label>
          <select
            value={preferences.default_asset_view}
            onChange={(e) => setPreferences({ ...preferences, default_asset_view: e.target.value })}
            className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2.5 text-sm text-white focus:border-canopy-green focus:outline-none"
          >
            <option value="side-by-side">Side-by-side Comparison</option>
            <option value="split-slider">Split Wiper / Interactive Slider</option>
            <option value="difference-highlight">Difference Mask Highlight</option>
          </select>
        </div>

        {/* Notifications Toggle */}
        <div className="pt-4 border-t border-canopy-border/50 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">In-App Event Alerts</h4>
            <p className="text-xs text-canopy-secondary mt-0.5">Show real-time notification badges for version commits and asset imports.</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.notifications_enabled}
            onChange={(e) => setPreferences({ ...preferences, notifications_enabled: e.target.checked })}
            className="h-4 w-4 rounded border-canopy-border bg-canopy-elevated text-canopy-green focus:ring-canopy-green"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-canopy-green text-black font-semibold hover:bg-emerald-400"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
        </Button>
      </div>
    </form>
  );
}
