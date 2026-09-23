import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind classes cleanly
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ── Canopy Brand & Logo System ────────────────────────────────────────────────

export function CanopySymbol({ className = 'h-6 w-6', ...props }) {
  return (
    <svg className={cn('text-canopy-green', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="24" height="24" rx="6" className="fill-canopy-green/10 stroke-canopy-green" strokeWidth="2" />
      <path d="M16 23V10" className="stroke-white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 14.5C13.1 14.2 10.8 12.5 9.7 9.7C12.7 9.3 15.3 10.5 16.8 13.2" className="stroke-canopy-green" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 18.8C19.6 18.5 22.3 16.4 23.2 12.8C19.7 12.5 16.9 14.2 15.6 17.4" className="stroke-canopy-green" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CanopyWordmark({ className = 'text-lg font-bold tracking-tight', ...props }) {
  return (
    <span className={cn('font-sans font-bold tracking-tight text-white', className)} {...props}>
      CANOPY
    </span>
  );
}

export function CanopyLogo({ className = '', symbolClass = 'h-6 w-6', wordmarkClass = 'text-base font-bold', ...props }) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)} {...props}>
      <CanopySymbol className={symbolClass} />
      <CanopyWordmark className={wordmarkClass} />
    </div>
  );
}

export function CanopyAppIcon({ className = 'h-12 w-12', ...props }) {
  return (
    <div className={cn('flex items-center justify-center rounded-md border border-canopy-border bg-canopy-surface p-2.5 shadow-md', className)} {...props}>
      <CanopySymbol className="h-full w-full" />
    </div>
  );
}

// ── Shared UI Primitives & Design System Controls ─────────────────────────────

export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ...props
}) {
  const baseStyles = 'inline-flex min-w-0 items-center justify-center rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canopy-bg disabled:pointer-events-none disabled:opacity-50 select-none';
  
  const variants = {
    default: 'bg-canopy-green text-[#06251A] font-semibold hover:bg-[#4ee0a0]',
    primary: 'bg-canopy-green text-[#06251A] font-semibold hover:bg-[#4ee0a0]',
    white: 'bg-white text-black font-semibold hover:bg-canopy-secondary',
    secondary: 'bg-canopy-surface text-white hover:bg-canopy-elevated border border-canopy-border',
    outline: 'border border-canopy-border bg-transparent hover:bg-canopy-surface text-canopy-secondary hover:text-white hover:border-canopy-muted',
    ghost: 'bg-transparent text-canopy-secondary hover:text-white hover:bg-canopy-surface',
    danger: 'border border-[#F43F5E]/35 bg-[#F43F5E]/10 text-rose-200 hover:bg-[#F43F5E]/20',
    warning: 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-[0.98]',
    ai: 'border border-canopy-ai/35 bg-canopy-ai/10 text-canopy-ai hover:bg-canopy-ai/15'
  };

  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 px-6 text-base font-semibold',
    icon: 'h-9 w-9 p-0'
  };

  return (
    <button
      className={cn(baseStyles, variants[variant] || variants.default, sizes[size] || sizes.default, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors';
  const variants = {
    default: 'bg-canopy-surface text-canopy-secondary border border-canopy-border',
    human: 'bg-canopy-surface text-canopy-secondary border border-canopy-border',
    model: 'bg-canopy-ai/10 text-canopy-ai border border-canopy-ai/30',
    success: 'bg-canopy-green/10 text-canopy-green border border-canopy-green/30',
    warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    error: 'bg-[#F43F5E]/10 text-rose-200 border border-[#F43F5E]/30'
  };

  return (
    <span className={cn(baseStyles, variants[variant] || variants.default, className)} {...props}>
      {children}
    </span>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={cn('rounded-md border border-canopy-border bg-canopy-surface text-canopy-text', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function IconButton({ className = '', label, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-canopy-border bg-canopy-surface text-canopy-secondary transition-colors hover:border-canopy-muted hover:bg-canopy-elevated hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canopy-bg disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white outline-none placeholder:text-canopy-muted focus:border-canopy-green focus:ring-1 focus:ring-canopy-green transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-canopy-border bg-canopy-elevated px-3.5 py-2 text-sm text-white outline-none placeholder:text-canopy-muted focus:border-canopy-green focus:ring-1 focus:ring-canopy-green transition-colors resize-none',
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className = '', children, ...props }) {
  return (
    <section className={cn('border border-canopy-border bg-canopy-surface rounded-md overflow-hidden', className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({ className = '', children, ...props }) {
  return (
    <div className={cn('border-b border-canopy-border px-4 py-3 text-sm font-semibold text-white flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function PropertyRow({ label, value, mono = false, className = '' }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs text-canopy-muted font-medium">{label}</div>
      <div className={cn('break-all text-xs text-white', mono && 'font-mono')}>{value || 'None'}</div>
    </div>
  );
}

export function StatusDot({ status = 'active', className = '' }) {
  const colors = {
    active: 'bg-canopy-green shadow-canopy-green/50',
    proposed: 'bg-purple-400 shadow-purple-400/50',
    warning: 'bg-amber-400 shadow-amber-400/50',
    error: 'bg-rose-400 shadow-rose-400/50',
    inactive: 'bg-canopy-muted'
  };
  return <span className={cn('inline-block h-2 w-2 rounded-full shadow-sm', colors[status] || colors.inactive, className)} />;
}

export function Skeleton({ className = '', ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-canopy-elevated/60', className)} {...props} />;
}

export function EmptyState({ icon = null, title, description, action = null, className = '' }) {
  return (
    <div className={cn('rounded-md border border-canopy-border bg-canopy-surface/60 p-6 text-center text-sm text-canopy-secondary', className)}>
      {icon ? <div className="mb-3 flex justify-center text-canopy-muted">{icon}</div> : null}
      <div className="font-semibold text-white">{title}</div>
      {description ? <p className="mt-1.5 text-xs text-canopy-secondary max-w-sm mx-auto leading-relaxed">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading...', className = '' }) {
  return (
    <div className={cn('flex items-center justify-center p-8 text-sm text-canopy-secondary gap-2.5', className)}>
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-canopy-green border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry = null, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4 text-sm text-rose-200', className)}>
      <span>{message || 'An error occurred.'}</span>
      {retry ? <Button size="sm" variant="outline" className="border-[#F43F5E]/30 text-rose-200 hover:bg-[#F43F5E]/20" onClick={retry}>Retry</Button> : null}
    </div>
  );
}
