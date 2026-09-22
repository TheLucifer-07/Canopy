import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/auth/AuthForm.jsx';
import { AuthLayout } from '../../components/auth/AuthLayout.jsx';
import { useAuthStore } from '../../stores/auth/authStore.js';

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const clearError = useAuthStore((state) => state.clearError);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const busy = status === 'authenticating';

  useEffect(() => {
    clearError();
  }, [clearError]);

  async function submit(input) {
    await signup(input);
    navigate('/app', { replace: true });
  }

  return (
    <AuthLayout
      eyebrow="New account"
      title="Create your Canopy account"
      body="Use an email and password to start preserving creative history."
      footer={<span>Already have an account? <Link to="/login" className="font-semibold text-canopy-green hover:text-white">Sign in</Link></span>}
    >
      <AuthForm mode="signup" busy={busy} serverError={error} onSubmit={submit} />
    </AuthLayout>
  );
}
