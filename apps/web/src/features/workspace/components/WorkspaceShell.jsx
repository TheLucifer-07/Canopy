import React, { useState } from 'react';
import { Bell, BookOpen, Bot, Code2, FolderKanban, GitCommit, Home, Library, LogOut, Menu, Search, Settings, User, X } from 'lucide-react';
import { IconButton, cn } from '@canopy/ui';
import { CanopyLogo } from '../../../components/branding/CanopyLogo.jsx';

const primaryNav = [
  ['Workspace', 'dashboard', Home],
  ['Projects', 'dashboard', FolderKanban],
  ['Versions', 'versions', GitCommit],
  ['Memory', 'memory', Library],
  ['Copilot', 'copilot', Bot],
  ['Developers', 'developers', Code2]
];

export function WorkspaceShell({ children, active = 'dashboard', user, onNavigate, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = (target) => {
    onNavigate(target);
    setMobileOpen(false);
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-canopy-bg text-canopy-text">
      <header className="sticky top-0 z-40 border-b border-canopy-border bg-[#090b0a]">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-canopy-secondary hover:bg-canopy-surface hover:text-white lg:hidden" aria-label="Open workspace navigation" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <CanopyLogo symbolClass="h-6 w-6" wordmarkClass="text-sm text-white" />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Workspace navigation">
              {primaryNav.map(([label, target, Icon]) => <WorkspaceNavButton key={label} label={label} target={target} Icon={Icon} active={active === target || (label === 'Projects' && active === 'project')} onNavigate={navigate} />)}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-9 w-72 items-center gap-2 border border-canopy-border bg-canopy-surface px-3 text-sm text-canopy-muted md:flex">
              <Search className="h-4 w-4" /><span>Project search comes from your project list</span>
            </div>
            <IconButton label="Notifications unavailable" disabled className="opacity-60"><Bell className="h-4 w-4" /></IconButton>
            <div className="relative">
              <IconButton label="Open profile menu" onClick={() => setProfileOpen((open) => !open)}><User className="h-4 w-4" /></IconButton>
              {profileOpen ? <ProfileMenu user={user} onNavigate={navigate} onSignOut={onSignOut} /> : null}
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_1fr]">
        <aside className="hidden min-h-[calc(100vh-3.5rem)] border-r border-canopy-border bg-[#0b0d0c] p-3 lg:block">
          <Sidebar active={active} onNavigate={navigate} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      {mobileOpen ? <MobileNav active={active} onNavigate={navigate} onClose={() => setMobileOpen(false)} onSignOut={onSignOut} /> : null}
    </div>
  );
}

function WorkspaceNavButton({ label, target, Icon, active, onNavigate }) {
  return <button className={cn('inline-flex h-9 items-center gap-2 px-3 text-sm transition hover:bg-canopy-surface hover:text-white', active ? 'text-white' : 'text-canopy-secondary')} onClick={() => onNavigate(target)}><Icon className="h-4 w-4" />{label}</button>;
}

function Sidebar({ active, onNavigate }) {
  return <div className="space-y-6">
    <NavGroup title="Product" items={primaryNav} active={active} onNavigate={onNavigate} />
    <NavGroup title="Support" items={[['Documentation', 'docs', BookOpen], ['Settings', 'settings', Settings]]} active={active} onNavigate={onNavigate} />
  </div>;
}

function NavGroup({ title, items, active, onNavigate }) {
  return <section><h2 className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">{title}</h2><div className="mt-2 grid gap-1">{items.map(([label, target, Icon]) => <button key={label} onClick={() => onNavigate(target)} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-canopy-surface hover:text-white', active === target ? 'bg-canopy-surface text-white' : 'text-canopy-secondary')}><Icon className="h-4 w-4 text-canopy-green" />{label}</button>)}</div></section>;
}

function ProfileMenu({ user, onNavigate, onSignOut }) {
  return <div className="absolute right-0 top-11 z-50 w-64 border border-canopy-border bg-canopy-surface p-2 shadow-2xl">
    <div className="border-b border-canopy-border px-3 py-3"><p className="text-sm font-semibold text-white">Canopy account</p><p className="mt-1 truncate text-xs text-canopy-secondary">{user?.email || 'Authenticated workspace'}</p></div>
    <button className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-canopy-secondary hover:bg-canopy-elevated hover:text-white" onClick={() => onNavigate('settings')}><Settings className="h-4 w-4" />Settings</button>
    <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-canopy-secondary hover:bg-canopy-elevated hover:text-white" onClick={onSignOut}><LogOut className="h-4 w-4" />Log out</button>
  </div>;
}

function MobileNav({ active, onNavigate, onClose, onSignOut }) {
  return <div className="fixed inset-0 z-50 bg-black/70 lg:hidden"><div className="h-full w-[86vw] max-w-sm border-r border-canopy-border bg-canopy-bg p-4"><div className="flex items-center justify-between"><CanopyLogo symbolClass="h-6 w-6" wordmarkClass="text-sm text-white" /><IconButton label="Close navigation" onClick={onClose}><X className="h-4 w-4" /></IconButton></div><div className="mt-6"><Sidebar active={active} onNavigate={onNavigate} /></div><button className="mt-8 flex w-full items-center gap-2 rounded-md border border-canopy-border px-3 py-3 text-left text-sm text-canopy-secondary" onClick={onSignOut}><LogOut className="h-4 w-4" />Log out</button></div></div>;
}
