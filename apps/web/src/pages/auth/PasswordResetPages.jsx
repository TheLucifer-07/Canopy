import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout.jsx';

export function ForgotPasswordPage() {
  return <UnsupportedPasswordPage title="Password reset is not wired yet" body="The current Canopy API does not include a password reset endpoint, so this prototype does not pretend to send a reset email." />;
}

export function ResetPasswordPage() {
  return <UnsupportedPasswordPage title="Reset link support is not available" body="The backend has no reset-token contract in this prototype. Sign in with an existing account or create a new one." />;
}

function UnsupportedPasswordPage({ title, body }) {
  return (
    <AuthLayout eyebrow="Prototype limitation" title={title} body={body} footer={<Link to="/login" className="font-semibold text-canopy-green hover:text-white">Back to sign in</Link>}>
      <div className="border border-canopy-border bg-canopy-bg p-4 text-sm leading-6 text-canopy-secondary">
        Email verification, OAuth, and password reset are intentionally not exposed until the API supports real flows.
      </div>
    </AuthLayout>
  );
}
