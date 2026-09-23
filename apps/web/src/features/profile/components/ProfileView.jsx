import React, { useState, useEffect } from 'react';
import {
  User,
  Activity,
  FolderKanban,
  GitCommit,
  Sparkles,
  Key,
  Globe,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  Sliders,
  History,
  Shield,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Button, cn } from '@canopy/ui';
import { formatRelativeTime, versionTitle } from '../../workspace/services/workspaceData.js';

export function ProfileView({ api, user, overview, onOpenProject }) {
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable Form State
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    avatar_url: '',
    preferences: {
      diff_detail_level: 'standard',
      copilot_groundedness: 'strict',
      default_asset_view: 'side-by-side',
      email_digest: true
    }
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let mounted = true;
    async function loadProfileData() {
      setLoading(true);
      setErrorMsg('');
      try {
        const [profileData, activityData] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getActivity().catch(() => ({ data: [] }))
        ]);

        if (mounted) {
          if (profileData) {
            setProfile(profileData);
            setFormData({
              display_name: profileData.display_name || '',
              username: profileData.username || '',
              bio: profileData.bio || '',
              location: profileData.location || '',
              website: profileData.website || '',
              avatar_url: profileData.avatar_url || '',
              preferences: {
                diff_detail_level: 'standard',
                copilot_groundedness: 'strict',
                default_asset_view: 'side-by-side',
                email_digest: true,
                ...(profileData.preferences || {})
              }
            });
          }
          if (activityData && Array.isArray(activityData.data)) {
            setActivity(activityData.data);
          }
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Failed to load profile details.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfileData();
    return () => {
      mounted = false;
    };
  }, [api]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updated = await api.updateProfile(formData);
      setProfile(updated);
      setSuccessMsg('Profile and preferences updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const email = user?.email || profile?.email || 'Authenticated User';
  const effectiveDisplayName = formData.display_name || profile?.display_name || email.split('@')[0];
  const effectiveUsername = formData.username || profile?.username || email.split('@')[0];
  const initial = (effectiveDisplayName || email).charAt(0).toUpperCase();

  const projects = overview?.model?.projects || [];
  const versions = overview?.model?.recentVersions || [];

  return (
    <div className="px-5 py-8 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <header className="flex flex-col gap-6 border-b border-canopy-border pb-8 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-canopy-green/40 bg-canopy-green/10 text-3xl font-bold text-canopy-green shadow-inner">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt={effectiveDisplayName}
                className="h-full w-full rounded-2xl object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{effectiveDisplayName}</h1>
              <span className="rounded-full border border-canopy-green/30 bg-canopy-green/10 px-2.5 py-0.5 text-xs font-semibold text-canopy-green">
                Workspace Creator
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-canopy-secondary">@{effectiveUsername}</p>
            <p className="mt-2 text-xs text-canopy-muted">{email}</p>
          </div>
        </div>

        {/* Action / Save Status */}
        <div className="flex items-center gap-3">
          {successMsg && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-canopy-border pb-4">
        {[
          { id: 'overview', label: 'Overview & Portfolio', icon: FolderKanban },
          { id: 'settings', label: 'Edit Profile & Identity', icon: User },
          { id: 'preferences', label: 'Creative Intelligence Settings', icon: Sliders },
          { id: 'activity', label: 'Activity & Audit Log', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition',
                isActive
                  ? 'border-canopy-green bg-canopy-green/10 text-white font-semibold'
                  : 'border-canopy-border text-canopy-secondary hover:bg-canopy-surface hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-canopy-green' : 'text-canopy-muted')} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Facts & Bio */}
          <div className="space-y-6">
            <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-canopy-muted">About Creator</h2>
              <p className="text-sm leading-relaxed text-canopy-secondary">
                {formData.bio || 'No creative bio or philosophy provided yet. Click "Edit Profile & Identity" to personalize.'}
              </p>

              <div className="space-y-2.5 pt-4 border-t border-canopy-border/60 text-xs text-canopy-secondary">
                {formData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-canopy-green shrink-0" />
                    <span>{formData.location}</span>
                  </div>
                )}
                {formData.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-canopy-green shrink-0" />
                    <a href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} target="_blank" rel="noreferrer" className="text-canopy-green hover:underline truncate">
                      {formData.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-canopy-muted">Workspace Statistics</h2>
              <dl className="mt-4 space-y-3">
                <div className="flex items-center justify-between border-b border-canopy-border/50 pb-2 text-sm">
                  <dt className="text-canopy-secondary">Creative Projects</dt>
                  <dd className="font-mono font-semibold text-canopy-green">{projects.length}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-canopy-border/50 pb-2 text-sm">
                  <dt className="text-canopy-secondary">Creative Versions</dt>
                  <dd className="font-mono font-semibold text-canopy-green">{versions.length}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-canopy-border/50 pb-2 text-sm">
                  <dt className="text-canopy-secondary">Activity Events</dt>
                  <dd className="font-mono font-semibold text-canopy-green">{activity.length}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right Column: Featured Projects & Recent Versions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-canopy-border bg-canopy-surface/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-canopy-muted">
                  <FolderKanban className="h-4 w-4 text-canopy-green" />
                  Your Creative Projects ({projects.length})
                </h2>
              </div>

              {projects.length > 0 ? (
                <div className="divide-y divide-canopy-border/70 border-y border-canopy-border/70">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onOpenProject(project.id)}
                      className="group flex cursor-pointer items-center justify-between gap-4 py-4 px-2 transition hover:bg-canopy-surface/80 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white group-hover:text-canopy-green transition">
                            {project.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-canopy-secondary truncate">
                          {project.creative_goal || 'No creative goal set.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="rounded bg-canopy-elevated px-2 py-0.5 text-xs text-canopy-muted font-mono">
                          {project.versionCount || 1} versions
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-canopy-muted group-hover:text-white transition" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-canopy-muted">
                  No creative projects created yet.
                </p>
              )}
            </div>

            {/* Recent Lineage Activity */}
            <div className="rounded-xl border border-canopy-border bg-canopy-surface/40 p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-canopy-muted mb-4">
                <Activity className="h-4 w-4 text-canopy-green" />
                Recent Lineage Activity
              </h2>

              {activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg border border-canopy-border/50 bg-canopy-surface/40 p-3">
                      <div className="mt-0.5 rounded-full bg-canopy-green/10 p-1 text-canopy-green">
                        <GitCommit className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{item.action}</p>
                        <p className="mt-0.5 text-xs text-canopy-secondary">
                          Project: <span className="text-canopy-green font-medium">{item.project_name}</span> · {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-sm text-canopy-muted">No recorded lineage events yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Settings & Profile Edit */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSave} className="max-w-3xl space-y-6">
          <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Public Profile & Identity</h2>
            <p className="text-xs text-canopy-secondary">
              Personalize how your creative identity appears across projects, diff audits, and memory artifacts.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g. Alex Mercer"
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Username (@handle)
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. alex_mercer"
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                Creative Bio & Philosophy
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Describe your design focus, creative workflow, or core artistic goals..."
                className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Location / Studio
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Website / Portfolio URL
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g. https://portfolio.design"
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                Avatar Image URL
              </label>
              <input
                type="text"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white placeholder:text-canopy-muted focus:border-canopy-green focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-canopy-green text-black font-semibold hover:bg-emerald-400"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Tab 3: Preferences */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSave} className="max-w-3xl space-y-6">
          <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Creative Intelligence Preferences</h2>
              <p className="text-xs text-canopy-secondary mt-1">
                Configure default AI reasoning depth, Semantic Diff detail, and copilot verification standards.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Semantic Diff Detail Level
                </label>
                <select
                  value={formData.preferences?.diff_detail_level || 'standard'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, diff_detail_level: e.target.value }
                    })
                  }
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white focus:border-canopy-green focus:outline-none"
                >
                  <option value="compact">Compact (High-level visual summary only)</option>
                  <option value="standard">Standard (Visual change, facet taxonomy, contribution breakdown)</option>
                  <option value="deep">Deep / Comprehensive (Full facet attribution, token-level audit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Copilot Evidence Verification
                </label>
                <select
                  value={formData.preferences?.copilot_groundedness || 'strict'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, copilot_groundedness: e.target.value }
                    })
                  }
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white focus:border-canopy-green focus:outline-none"
                >
                  <option value="strict">Strict (Require exact version/memory citation before answering)</option>
                  <option value="balanced">Balanced (Grounded with creative synthesis)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Default Asset Inspector Layout
                </label>
                <select
                  value={formData.preferences?.default_asset_view || 'side-by-side'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, default_asset_view: e.target.value }
                    })
                  }
                  className="w-full rounded-lg border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white focus:border-canopy-green focus:outline-none"
                >
                  <option value="side-by-side">Side-by-side Comparison</option>
                  <option value="split-slider">Split Wiper / Slider</option>
                  <option value="difference-highlight">Difference Mask Highlight</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-canopy-green text-black font-semibold hover:bg-emerald-400"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      )}

      {/* Tab 4: Activity Stream */}
      {activeTab === 'activity' && (
        <div className="max-w-4xl space-y-4">
          <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6">
            <h2 className="text-base font-semibold text-white mb-2">Audit & Lineage Trail</h2>
            <p className="text-xs text-canopy-secondary mb-6">
              Complete chronological record of all creative actions, version commits, and asset modifications across your workspace.
            </p>

            {activity.length > 0 ? (
              <div className="relative border-l-2 border-canopy-border/80 ml-3 space-y-6 py-2">
                {activity.map((item) => (
                  <div key={item.id} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-canopy-bg bg-canopy-green" />
                    <div className="rounded-lg border border-canopy-border/60 bg-canopy-surface/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{item.action}</span>
                        <span className="text-xs font-mono text-canopy-muted">{formatRelativeTime(item.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-xs text-canopy-secondary">
                        Project: <span className="text-canopy-green font-medium">{item.project_name}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-canopy-muted">No activity events recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
