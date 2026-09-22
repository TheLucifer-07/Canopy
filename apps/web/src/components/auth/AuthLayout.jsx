import React from 'react';
import { Link } from 'react-router-dom';
import { CanopyLogo } from '../branding/CanopyLogo.jsx';

export function AuthLayout({ eyebrow, title, body, children, footer }) {
  return (
    <main className="min-h-screen bg-canopy-bg px-5 py-8 text-canopy-text">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center">
        <Link to="/" aria-label="Canopy home" className="mb-8 inline-flex justify-center">
          <CanopyLogo symbolClass="h-9 w-9" wordmarkClass="text-lg text-white" />
        </Link>
        <section className="border border-canopy-border bg-canopy-surface p-6 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">{eyebrow}</p>
          <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-canopy-secondary">{body}</p>
          <div className="mt-7">{children}</div>
        </section>
        {footer ? <div className="mt-5 text-center text-sm text-canopy-secondary">{footer}</div> : null}
      </div>
    </main>
  );
}
