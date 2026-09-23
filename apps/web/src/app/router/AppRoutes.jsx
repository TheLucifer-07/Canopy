import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoadingState } from '@canopy/ui';
import { NotFoundState, ForbiddenState, ServerErrorState, MaintenanceState } from '../../components/system/index.js';
import { MarketingShell } from '../../components/marketing/MarketingShell.jsx';
import {
  AndroidDownloadPage, ContactPage, DevelopersPage, DocumentationPage, FeaturesPage, HomePage,
  HowItWorksPage, NotFoundPage, PricingPage, UseCasesPage
} from '../../pages/public/PublicPages.jsx';
import { LoginPage } from '../../pages/auth/LoginPage.jsx';
import { SignupPage } from '../../pages/auth/SignupPage.jsx';
import { ForgotPasswordPage, ResetPasswordPage } from '../../pages/auth/PasswordResetPages.jsx';
import { WorkspaceFrame } from '../../workspace/Workspace.jsx';
import { useApi } from '../../shared/api.js';
import { useAuthStore } from '../../stores/auth/authStore.js';

export function AppRoutes() {
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const restore = useAuthStore((state) => state.restore);
  const logout = useAuthStore((state) => state.logout);
  const api = useApi(session);

  useEffect(() => {
    restore();
  }, [restore]);

  if (status === 'initializing') return <LoadingState label="Initializing Canopy" className="h-screen bg-canopy-bg text-canopy-text" />;

  return <Routes>
    <Route element={<MarketingShell session={session} onSignOut={logout} />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/use-cases" element={<UseCasesPage />} />
      <Route path="/developers" element={<DevelopersPage />} />
      <Route path="/docs" element={<DocumentationPage />} />
      <Route path="/documentation" element={<Navigate to="/docs" replace />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/download/android" element={<AndroidDownloadPage />} />
      <Route path="/forbidden" element={<ForbiddenState title="Access Denied" description="You don't have permission to access this page." homeLabel="Return Home" onHome={() => window.location.href = '/'} />} />
      <Route path="/maintenance" element={<MaintenanceState />} />
      <Route path="/error" element={<ServerErrorState title="Server Error" description="Something went wrong on our end. Please try again later." onRetry={() => window.location.reload()} />} />
      <Route path="*" element={<NotFoundState title="Page Not Found" description="This route has no history yet. Return to the public foundation or open the workspace." homeLabel="Back to Home" onHome={() => window.location.href = '/'} />} />
    </Route>
    <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
    <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
    <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
    <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
    <Route path="/app/*" element={<ProtectedRoute session={session}><WorkspaceRoute api={api} user={user} onSignOut={logout} /></ProtectedRoute>} />
  </Routes>;
}


function GuestRoute({ children }) {
  const session = useAuthStore((state) => state.session);
  return session ? <Navigate to="/app" replace /> : children;
}

function ProtectedRoute({ session, children }) {
  const location = useLocation();
  return session ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

function WorkspaceRoute({ api, user, onSignOut }) {
  const location = useLocation();
  const navigate = useNavigate();
  const projectMatch = location.pathname.match(/^\/app\/projects\/([^/]+)(?:\/([^/]+))?$/);
  const sectionMatch = location.pathname.match(/^\/app\/([^/]+)$/);
  const view = projectMatch
    ? { name: projectMatch[2] === 'workbench' ? 'project-workbench' : 'project-home', projectId: projectMatch[1], tab: projectMatch[2] || 'home' }
    : sectionMatch ? { name: sectionMatch[1] } : { name: 'dashboard' };
  const setView = (next) => {
    if (next.name === 'project-home') navigate(`/app/projects/${next.projectId}${next.tab && next.tab !== 'home' ? `/${next.tab}` : ''}`);
    else if (next.name === 'project-workbench') navigate(`/app/projects/${next.projectId}/workbench`);
    else if (next.name === 'home') navigate('/');
    else if (next.name && next.name !== 'dashboard') navigate(`/app/${next.name}`);
    else navigate('/app');
  };
  return <WorkspaceFrame api={api} user={user} view={view} setView={setView} onSignOut={() => { onSignOut(); navigate('/login'); }} />;
}
