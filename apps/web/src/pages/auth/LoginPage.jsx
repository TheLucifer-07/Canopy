import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/auth/AuthForm.jsx';
import { AuthLayout } from '../../components/auth/AuthLayout.jsx';
import { useAuthStore } from '../../stores/auth/authStore.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const busy = status === 'authenticating';
  const redirectTo = location.state?.from?.pathname || '/app';

  useEffect(() => {
    clearError();
  }, [clearError]);

  async function submit(input) {
    await login(input);
    navigate(redirectTo, { replace: true });
  }

  return (
    <AuthLayout
      eyebrow="Canopy account"
      title="Sign in to Canopy"
      body="Continue with your Canopy account."
      footer={<span>Do not have an account? <Link to="/signup" className="font-semibold text-canopy-green hover:text-white">Create account</Link></span>}
    >
      <AuthForm mode="login" busy={busy} serverError={error} onSubmit={submit} />
      <div className="mt-4 text-center">
        <Link to="/forgot-password" className="text-sm text-canopy-secondary hover:text-white">Forgot password?</Link>
      </div>
    </AuthLayout>
  );
}
