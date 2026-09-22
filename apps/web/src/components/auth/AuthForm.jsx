import React, { useId, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button, Input } from '@canopy/ui';
import { firstError, validateLoginInput, validateSignupInput } from '../../features/auth/authValidation.js';

export function AuthForm({ mode, serverError = '', busy = false, onSubmit }) {
  const emailId = useId();
  const passwordId = useId();
  const displayNameId = useId();
  const confirmPasswordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const isSignup = mode === 'signup';

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = isSignup ? validateSignupInput(values) : validateLoginInput(values);
    setErrors(nextErrors);
    if (firstError(nextErrors)) return;
    try {
      await onSubmit(values);
    } catch {
      // The auth store maps failures to visible form errors.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {isSignup ? (
        <Field label="Name" id={displayNameId} error={errors.displayName}>
          <Input id={displayNameId} name="name" autoComplete="name" value={values.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Your name" />
        </Field>
      ) : null}
      <Field label="Email" id={emailId} error={errors.email}>
        <Input id={emailId} name="email" type="email" autoComplete="email" inputMode="email" value={values.email} onChange={(event) => update('email', event.target.value)} placeholder="you@company.com" aria-invalid={Boolean(errors.email)} />
      </Field>
      <Field label="Password" id={passwordId} error={errors.password}>
        <div className="relative">
          <Input id={passwordId} name={isSignup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={values.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" className="pr-11" aria-invalid={Boolean(errors.password)} />
          <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-canopy-muted transition hover:bg-canopy-surface hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      {isSignup ? (
        <Field label="Confirm password" id={confirmPasswordId} error={errors.confirmPassword}>
          <Input id={confirmPasswordId} name="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Repeat your password" aria-invalid={Boolean(errors.confirmPassword)} />
        </Field>
      ) : null}
      {serverError ? <p role="alert" className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{serverError}</p> : null}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {busy ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Sign in')}
      </Button>
    </form>
  );
}

function Field({ label, id, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white" htmlFor={id}>{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
