import React, { useState } from 'react';
import { Activity, Bookmark, Code2, FolderKanban, Home, LogOut, Menu, Search, Settings, Shield, User, X } from 'lucide-react';
import { IconButton, cn } from '@canopy/ui';
import { CanopyLogo } from '../../../components/branding/CanopyLogo.jsx';
import { NotificationPopover, useNotifications } from '../../user-system/index.js';

const primaryNav = [
  { label: 'Workspace', target: 'dashboard', icon: Home },
  { label: 'Projects', target: 'projects', icon: FolderKanban },
  { label: 'Activity', target: 'activity', icon: Activity }
];

const developerNav = [
  { label: 'Developers', target: 'developers', icon: Code2 }
];

const accountNav = [
  { label: 'Profile', target: 'profile', icon: User },
  { label: 'Saved Items', target: 'saved-items', icon: Bookmark },
  { label: 'Settings', target: 'settings', icon: Settings },
  { label: 'Security', target: 'security', icon: Shield }
];

export function WorkspaceShell({ api, children, active = 'dashboard', user, onNavigate, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationsHook = useNotifications(api);

  const navigate = (target) => {
    onNavigate(target);
    setMobileOpen(false);
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-canopy-bg text-canopy-text">
      <header className="sticky top-0 z-40 border-b border-canopy-border bg-canopy-surface/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-6">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-canopy-secondary hover:bg-canopy-surface hover:text-white lg:hidden" aria-label="Open workspace navigation" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <CanopyLogo symbolClass="h-6 w-6" wordmarkClass="text-sm text-white" />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Workspace navigation">
              {primaryNav.map((item) => <WorkspaceNavButton key={item.label} item={item} active={(item.target === 'dashboard' && active === 'dashboard') || active === item.target || (item.label === 'Projects' && active === 'project')} onNavigate={navigate} />)}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-64 items-center gap-2 rounded-md border border-canopy-border bg-canopy-elevated px-3 text-xs text-canopy-muted md:flex">
              <Search className="h-3.5 w-3.5 text-canopy-muted" /><span>Search workspace...</span>
            </div>
            <NotificationPopover hook={notificationsHook} onNavigate={onNavigate} />
            <div className="relative">
              <button aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-canopy-border bg-canopy-surface transition hover:border-canopy-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green">
                <Avatar email={user?.email} />
              </button>
              {profileOpen ? <ProfileMenu user={user} onNavigate={navigate} onSignOut={onSignOut} /> : null}
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[216px_1fr]">
        <aside className="hidden min-h-[calc(100vh-3.5rem)] border-r border-canopy-border bg-canopy-bg p-3 lg:block">
          <Sidebar active={active} onNavigate={navigate} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      {mobileOpen ? <MobileNav active={active} onNavigate={navigate} onClose={() => setMobileOpen(false)} onSignOut={onSignOut} /> : null}
    </div>
  );
}

function WorkspaceNavButton({ item, active, onNavigate }) {
  const Icon = item.icon;
  return <button className={cn('inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm transition hover:bg-canopy-elevated hover:text-white', active ? 'bg-canopy-elevated text-white font-medium' : 'text-canopy-secondary')} onClick={() => onNavigate(item.target)}><Icon className={cn('h-4 w-4', item.target === 'copilot' ? 'text-canopy-ai' : 'text-canopy-muted')} />{item.label}</button>;
}

function Sidebar({ active, onNavigate }) {
  return <div className="space-y-6">
    <NavGroup title="Product" items={primaryNav} active={active} onNavigate={onNavigate} />
    <NavGroup title="Developer" items={developerNav} active={active} onNavigate={onNavigate} />
    <NavGroup title="Account" items={accountNav} active={active} onNavigate={onNavigate} />
  </div>;
}

function NavGroup({ title, items, active, onNavigate }) {
  return <section><h2 className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">{title}</h2><div className="mt-2 grid gap-1">{items.map((item) => {
    const Icon = item.icon;
    return <button key={item.label} onClick={() => onNavigate(item.target)} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-canopy-elevated hover:text-white', active === item.target ? 'bg-canopy-elevated text-white font-medium border-l-2 border-canopy-green rounded-l-none' : 'text-canopy-secondary')}><Icon className={cn('h-4 w-4', item.target === 'copilot' ? 'text-canopy-ai' : 'text-canopy-muted')} />{item.label}</button>;
  })}</div></section>;
}

function ProfileMenu({ user, onNavigate, onSignOut }) {
  return <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-canopy-border bg-canopy-surface p-2 shadow-2xl">
    <div className="flex gap-3 border-b border-canopy-border px-3 py-3"><Avatar email={user?.email} /><div className="min-w-0"><p className="text-sm font-semibold text-white">Canopy Profile</p><p className="mt-1 truncate text-xs text-canopy-secondary">{user?.email || 'Authenticated workspace'}</p></div></div>
    <button className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-canopy-secondary hover:bg-canopy-elevated hover:text-white" onClick={() => onNavigate('profile')}><User className="h-4 w-4" />Profile</button>
    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-canopy-secondary hover:bg-canopy-elevated hover:text-white" onClick={() => onNavigate('security')}><Shield className="h-4 w-4" />Security</button>
    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-canopy-secondary hover:bg-canopy-elevated hover:text-white" onClick={() => onNavigate('settings')}><Settings className="h-4 w-4" />Settings</button>
    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-canopy-secondary hover:bg-canopy-elevated hover:text-white" onClick={onSignOut}><LogOut className="h-4 w-4" />Log out</button>
  </div>;
}

function Avatar({ email }) {
  const initial = (email || 'C').trim().charAt(0).toUpperCase();
  return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-canopy-green/40 bg-canopy-green/10 text-xs font-semibold text-canopy-green">{initial}</span>;
}

function MobileNav({ active, onNavigate, onClose, onSignOut }) {
  return <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"><div className="h-full w-[86vw] max-w-sm border-r border-canopy-border bg-canopy-bg p-4"><div className="flex items-center justify-between"><CanopyLogo symbolClass="h-6 w-6" wordmarkClass="text-sm text-white" /><IconButton label="Close navigation" onClick={onClose}><X className="h-4 w-4" /></IconButton></div><div className="mt-6"><Sidebar active={active} onNavigate={onNavigate} /></div><button className="mt-8 flex w-full items-center gap-2 rounded-md border border-canopy-border px-3 py-3 text-left text-sm text-canopy-secondary hover:text-white" onClick={onSignOut}><LogOut className="h-4 w-4" />Log out</button></div></div>;
}
