import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { IconButton, cn } from '@canopy/ui';
import { CanopyLogo } from '../branding/CanopyLogo.jsx';
import { Icons, iconSize } from '../icons/index.jsx';

const platformItems = [
  ['Creative Projects', 'Organize the work and its context.', '/features', Icons.FolderKanban],
  ['Creative Lineage', 'Trace every branch and merge.', '/how-it-works', Icons.GitBranch],
  ['Semantic Diff', 'See what changed and why.', '/features', Icons.FileDiff],
  ['Creative Memory', 'Preserve decisions worth keeping.', '/features', Icons.Library]
];
const resourceItems = [
  ['How it works', '/how-it-works', Icons.History],
  ['Use cases', '/use-cases', Icons.Network],
  ['Documentation', '/docs', Icons.BookOpen],
  ['Contact', '/contact', Icons.CircleHelp]
];

export function MarketingShell({ session, onSignOut }) {
  return <div className="min-h-screen overflow-x-hidden bg-canopy-bg text-canopy-text selection:bg-canopy-green/25">
    <MarketingHeader session={session} onSignOut={onSignOut} />
    <main><Outlet /></main>
    <MarketingFooter />
  </div>;
}

function MarketingHeader({ session, onSignOut }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => { setOpenMenu(null); setMobileOpen(false); };
  return <header className="sticky top-0 z-50 border-b border-canopy-border/80 bg-canopy-bg/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link to="/" aria-label="Canopy home" onClick={close}><CanopyLogo symbolClass="h-7 w-7" wordmarkClass="text-base text-canopy-text" /></Link>
      <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary navigation">
        <MegaTrigger label="Platform" open={openMenu === 'platform'} onToggle={() => setOpenMenu(openMenu === 'platform' ? null : 'platform')}>
          <MegaPanel title="The Canopy platform" items={platformItems} onNavigate={close} />
        </MegaTrigger>
        <MegaTrigger label="Solutions" open={openMenu === 'solutions'} onToggle={() => setOpenMenu(openMenu === 'solutions' ? null : 'solutions')}>
          <MegaPanel title="Built around creative work" items={[["Creative teams", "Review directions without losing context.", "/use-cases", Icons.Network], ["AI-assisted work", "Keep human and model provenance visible.", "/use-cases", Icons.Sparkles], ["Asset preservation", "Return to the decision, not just the file.", "/how-it-works", Icons.History]]} onNavigate={close} />
        </MegaTrigger>
        <NavLink to="/developers" className={navClass} onClick={close}>Developers</NavLink>
        <MegaTrigger label="Resources" open={openMenu === 'resources'} onToggle={() => setOpenMenu(openMenu === 'resources' ? null : 'resources')}>
          <MegaPanel title="Start with the essentials" items={resourceItems.map(([title, to, Icon]) => [title, 'Explore Canopy in context.', to, Icon])} onNavigate={close} />
        </MegaTrigger>
        <NavLink to="/pricing" className={navClass} onClick={close}>Pricing</NavLink>
      </nav>
      <div className="hidden items-center gap-2 lg:flex">
        <Link to="/docs" className="inline-flex h-9 items-center gap-2 px-2 text-sm text-canopy-secondary transition hover:text-white"><Icons.Search className={iconSize.ui} /> Search docs</Link>
        {session ? <><Link to="/app" className="rounded-md bg-canopy-green px-3 py-2 text-sm font-semibold text-[#06251A] hover:bg-[#54e7ad]">Open workspace</Link><IconButton label="Sign out" onClick={onSignOut}><Icons.X className={iconSize.ui} /></IconButton></> : <><Link to="/login" className="px-3 py-2 text-sm text-canopy-secondary hover:text-white">Sign in</Link><Link to="/signup" className="rounded-md bg-canopy-green px-3 py-2 text-sm font-semibold text-[#06251A] hover:bg-[#54e7ad]">Get started</Link></>}
      </div>
      <button className="inline-flex h-10 w-10 items-center justify-center rounded-md text-canopy-secondary hover:bg-canopy-surface hover:text-white lg:hidden" aria-label="Open navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <Icons.X className={iconSize.feature} /> : <Icons.Menu className={iconSize.feature} />}</button>
    </div>
    {mobileOpen ? <MobileMenu session={session} onSignOut={onSignOut} close={close} /> : null}
  </header>;
}

function MegaTrigger({ label, open, onToggle, children }) {
  return <div className="relative h-full"><button className="inline-flex h-full items-center gap-1 px-3 text-sm text-canopy-secondary transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green" aria-haspopup="true" aria-expanded={open} onClick={onToggle}>{label}<Icons.ChevronDown className={cn(iconSize.ui, open && 'rotate-180')} /></button>{open ? children : null}</div>;
}

function MegaPanel({ title, items, onNavigate }) {
  return <section className="absolute left-0 top-[58px] z-10 w-[520px] border border-canopy-border bg-[#080909] p-5 shadow-2xl" aria-label={title}>
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">{title}</p><div className="grid grid-cols-2 gap-2">
      {items.map(([title, description, to, Icon]) => <Link key={title} to={to} onClick={onNavigate} className="group flex gap-3 p-3 transition hover:bg-canopy-elevated"><Icon className="mt-0.5 h-5 w-5 text-canopy-green" /><span><span className="block text-sm font-semibold text-white">{title}</span><span className="mt-1 block text-xs leading-5 text-canopy-secondary">{description}</span></span></Link>)}
    </div>
  </section>;
}

function MobileMenu({ session, onSignOut, close }) {
  return <nav className="border-t border-canopy-border bg-canopy-bg px-5 py-5 lg:hidden" aria-label="Mobile navigation"><div className="grid gap-1">
    {[['Platform', '/features'], ['How it works', '/how-it-works'], ['Use cases', '/use-cases'], ['Developers', '/developers'], ['Documentation', '/docs'], ['Pricing', '/pricing'], ['Contact', '/contact']].map(([label, to]) => <Link key={to} to={to} onClick={close} className="rounded-md px-3 py-3 text-sm font-medium text-canopy-secondary hover:bg-canopy-surface hover:text-white">{label}</Link>)}
    {session ? <><Link to="/app" onClick={close} className="mt-2 rounded-md bg-canopy-green px-3 py-3 text-center text-sm font-semibold text-[#06251A]">Open workspace</Link><button onClick={() => { onSignOut(); close(); }} className="px-3 py-3 text-left text-sm text-canopy-secondary">Sign out</button></> : <div className="mt-3 grid grid-cols-2 gap-2"><Link to="/login" onClick={close} className="rounded-md border border-canopy-border px-3 py-3 text-center text-sm text-white">Sign in</Link><Link to="/signup" onClick={close} className="rounded-md bg-canopy-green px-3 py-3 text-center text-sm font-semibold text-[#06251A]">Get started</Link></div>}
  </div></nav>;
}

function MarketingFooter() {
  return <footer className="border-t border-canopy-border bg-[#070909]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-5 lg:px-8"><div className="lg:col-span-2"><CanopyLogo symbolClass="h-7 w-7" wordmarkClass="text-base text-white" /><p className="mt-4 max-w-sm text-sm leading-6 text-canopy-secondary">Creative history for work that crosses people, tools, assets, and AI systems.</p><p className="mt-6 text-xs text-canopy-muted">Canopy Platform · Prototype</p></div><FooterColumn title="Product" links={[["Features", "/features"], ["How it works", "/how-it-works"], ["Use cases", "/use-cases"], ["Pricing", "/pricing"]]} /><FooterColumn title="Developers" links={[["Canopy API", "/developers"], ["MCP", "/developers"], ["Documentation", "/docs"]]} /><FooterColumn title="Resources" links={[["Contact", "/contact"], ["Android", "/download/android"], ["Support", "/contact"]]} /></div></footer>;
}
function FooterColumn({ title, links }) { return <div><h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">{title}</h2><ul className="space-y-3">{links.map(([label, to]) => <li key={to + label}><Link to={to} className="text-sm text-canopy-secondary hover:text-canopy-green">{label}</Link></li>)}</ul></div>; }
const navClass = ({ isActive }) => cn('inline-flex h-full items-center px-3 text-sm transition hover:text-white', isActive ? 'text-white' : 'text-canopy-secondary');
