import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind classes cleanly (shadcn/ui compatible)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Shared Button primitive
 */
export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 bg-[#242A26] text-[#E9EDE9] hover:bg-[#39413B]',
    secondary: 'bg-[#1C201D] text-[#9AA69D] hover:bg-[#242A26]',
    outline: 'border border-[#242A26] bg-transparent hover:bg-[#151816] text-[#E9EDE9]'
  };

  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-8 text-base'
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

/**
 * Shared Badge primitive
 */
export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const variants = {
    default: 'bg-[#242A26] text-[#E9EDE9]',
    human: 'bg-[#E0A458]/20 text-[#E0A458] border border-[#E0A458]/30',
    model: 'bg-[#6E9075]/20 text-[#6E9075] border border-[#6E9075]/30'
  };

  return (
    <span className={cn(baseStyles, variants[variant] || variants.default, className)} {...props}>
      {children}
    </span>
  );
}

/**
 * Shared Card primitive
 */
export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-[#242A26] bg-[#151816] text-[#E9EDE9] shadow-sm', className)}
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
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#272D35] bg-[#171B21] text-[#F5F7FA] transition-colors hover:border-[#8B5CF6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8B5CF6] disabled:pointer-events-none disabled:opacity-50',
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
        'w-full rounded-md border border-[#272D35] bg-[#171B21] px-3 py-2 text-sm text-[#F5F7FA] outline-none placeholder:text-[#667085] focus:border-[#8B5CF6]',
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
        'w-full rounded-md border border-[#272D35] bg-[#171B21] px-3 py-2 text-sm text-[#F5F7FA] outline-none placeholder:text-[#667085] focus:border-[#8B5CF6]',
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className = '', children, ...props }) {
  return (
    <section className={cn('border border-[#272D35] bg-[#11151A]', className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({ className = '', children, ...props }) {
  return (
    <div className={cn('border-b border-[#272D35] px-4 py-3 text-sm font-semibold text-[#F5F7FA]', className)} {...props}>
      {children}
    </div>
  );
}

export function PropertyRow({ label, value, mono = false, className = '' }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs text-[#667085]">{label}</div>
      <div className={cn('break-all text-xs text-[#9AA4B2]', mono && 'font-mono')}>{value || 'None'}</div>
    </div>
  );
}

export function EmptyState({ icon = null, title, description, action = null, className = '' }) {
  return (
    <div className={cn('p-4 text-center text-sm text-[#9AA4B2]', className)}>
      {icon ? <div className="mb-3 flex justify-center text-[#9AA4B2]">{icon}</div> : null}
      <div className="font-medium text-[#F5F7FA]">{title}</div>
      {description ? <p className="mt-1 text-xs text-[#667085]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading', className = '' }) {
  return <div className={cn('p-4 text-sm text-[#667085]', className)}>{label}</div>;
}

export function ErrorState({ message, className = '' }) {
  return <div className={cn('p-4 text-sm text-[#EF4444]', className)}>{message}</div>;
}
