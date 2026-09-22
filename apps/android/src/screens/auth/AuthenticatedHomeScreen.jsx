import React from 'react';
import { WorkspaceScreen } from '../workspace/WorkspaceScreen.jsx';

export function AuthenticatedHomeScreen({ session, user, onLogout }) {
  return <WorkspaceScreen session={session} user={user} onLogout={onLogout} />;
}
