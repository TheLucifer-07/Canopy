import React, { useState, useEffect } from 'react';
import { Moon, Monitor, Sliders, CheckCircle2, Save } from 'lucide-react';
import { Button, cn } from '@canopy/ui';

export function AppearanceSettings({ settings, onSave, saving }) {
  const [appearance, setAppearance] = useState({
    theme: 'dark',
    density: 'comfortable',
    reduced_motion: false
  });

  useEffect(() => {
    if (settings?.appearance) {
      setAppearance({
        theme: settings.appearance.theme || 'dark',
        density: settings.appearance.density || 'comfortable',
        reduced_motion: Boolean(settings.appearance.reduced_motion)
      });
    }
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ appearance });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Appearance & Theme</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Customize the aesthetic density, animation motion, and display contrast of the Canopy workspace.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-6">
        {/* Theme Mode */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-3">
            Interface Theme
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'dark', title: 'Canopy Dark (Default)', desc: 'Near-black OLED surfaces with emerald accents', icon: Moon },
              { id: 'system', title: 'Follow System', desc: 'Sync automatically with OS dark/light mode preference', icon: Monitor }
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = appearance.theme === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setAppearance({ ...appearance, theme: option.id })}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition',
                    isSelected
                      ? 'border-canopy-green bg-canopy-green/10 shadow-sm'
                      : 'border-canopy-border bg-canopy-elevated/40 hover:border-canopy-border/80'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-canopy-green' : 'text-canopy-muted')} />
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-canopy-green" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white">{option.title}</h4>
                  <p className="mt-1 text-xs text-canopy-secondary leading-snug">{option.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Layout Density */}
        <div className="pt-4 border-t border-canopy-border/50">
          <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-3">
            Workspace Density
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'comfortable', title: 'Comfortable (Standard)', desc: 'Generous whitespace for creative inspection' },
              { id: 'compact', title: 'Compact (High Density)', desc: 'Tighter margins for large DAG lineages' }
            ].map((option) => {
              const isSelected = appearance.density === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setAppearance({ ...appearance, density: option.id })}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition',
                    isSelected
                      ? 'border-canopy-green bg-canopy-green/10'
                      : 'border-canopy-border bg-canopy-elevated/40 hover:border-canopy-border/80'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-white">{option.title}</h4>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-canopy-green" />}
                  </div>
                  <p className="text-xs text-canopy-secondary">{option.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reduced Motion Toggle */}
        <div className="pt-4 border-t border-canopy-border/50 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Reduced Motion</h4>
            <p className="text-xs text-canopy-secondary mt-0.5">Disable subtle DAG layout transitions and animations.</p>
          </div>
          <input
            type="checkbox"
            checked={appearance.reduced_motion}
            onChange={(e) => setAppearance({ ...appearance, reduced_motion: e.target.checked })}
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
          <span>{saving ? 'Saving...' : 'Save Appearance'}</span>
        </Button>
      </div>
    </form>
  );
}
