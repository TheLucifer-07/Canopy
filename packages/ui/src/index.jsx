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
    <svg className={cn('text-emerald-400', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="24" height="24" rx="7" className="fill-emerald-500/12 stroke-emerald-400" strokeWidth="2" />
      <path d="M16 23V10" className="stroke-emerald-200" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 14.5C13.1 14.2 10.8 12.5 9.7 9.7C12.7 9.3 15.3 10.5 16.8 13.2" className="stroke-emerald-400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 18.8C19.6 18.5 22.3 16.4 23.2 12.8C19.7 12.5 16.9 14.2 15.6 17.4" className="stroke-emerald-400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CanopyWordmark({ className = 'text-lg font-bold tracking-tight', ...props }) {
  return (
    <span className={cn('font-sans font-extrabold tracking-tight text-text', className)} {...props}>
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
    <div className={cn('flex items-center justify-center rounded-lg border border-border bg-surface p-2.5 shadow-md', className)} {...props}>
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
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 select-none';
  
  const variants = {
    default: 'bg-[#43D391] text-[#06251A] font-semibold shadow hover:bg-[#54e7ad] active:scale-[0.98]',
    primary: 'bg-[#43D391] text-[#06251A] font-semibold shadow hover:bg-[#54e7ad] active:scale-[0.98]',
    secondary: 'bg-elevated text-text hover:bg-surface border border-border active:scale-[0.98]',
    outline: 'border border-border bg-transparent hover:bg-surface text-text active:scale-[0.98]',
    ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]'
  };

  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-11 rounded-lg px-6 text-base font-semibold',
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
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const variants = {
    default: 'bg-elevated text-text border border-border',
    human: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    model: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    error: 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
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
      className={cn('rounded-xl border border-border bg-surface text-text shadow-sm transition-all', className)}
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
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-primary hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
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
        'w-full rounded-lg border border-border bg-elevated px-3.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary transition-all',
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
        'w-full rounded-lg border border-border bg-elevated px-3.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none',
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className = '', children, ...props }) {
  return (
    <section className={cn('border border-border bg-surface rounded-xl overflow-hidden', className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({ className = '', children, ...props }) {
  return (
    <div className={cn('border-b border-border px-4 py-3 text-sm font-semibold text-text flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function PropertyRow({ label, value, mono = false, className = '' }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs text-muted font-medium">{label}</div>
      <div className={cn('break-all text-xs text-text', mono && 'font-mono')}>{value || 'None'}</div>
    </div>
  );
}

export function StatusDot({ status = 'active', className = '' }) {
  const colors = {
    active: 'bg-emerald-500 shadow-emerald-500/50',
    proposed: 'bg-amber-500 shadow-amber-500/50',
    error: 'bg-rose-500 shadow-rose-500/50',
    inactive: 'bg-zinc-500'
  };
  return <span className={cn('inline-block h-2 w-2 rounded-full shadow-sm', colors[status] || colors.inactive, className)} />;
}

export function Skeleton({ className = '', ...props }) {
  return <div className={cn('animate-pulse rounded-lg bg-elevated/60', className)} {...props} />;
}

export function EmptyState({ icon = null, title, description, action = null, className = '' }) {
  return (
    <div className={cn('p-6 text-center text-sm text-muted rounded-xl border border-dashed border-border bg-surface/50', className)}>
      {icon ? <div className="mb-3 flex justify-center text-muted">{icon}</div> : null}
      <div className="font-semibold text-text">{title}</div>
      {description ? <p className="mt-1.5 text-xs text-muted max-w-sm mx-auto leading-relaxed">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading...', className = '' }) {
  return (
    <div className={cn('flex items-center justify-center p-8 text-sm text-muted gap-2', className)}>
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry = null, className = '' }) {
  return (
    <div className={cn('p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm flex items-center justify-between', className)}>
      <span>{message || 'An error occurred.'}</span>
      {retry ? <Button size="sm" variant="outline" className="border-rose-500/30 hover:bg-rose-500/20" onClick={retry}>Retry</Button> : null}
    </div>
  );
}
