import React from 'react';
import { ProjectsIndex } from '../../features/projects/components/ProjectsIndex.jsx';
import { WorkspaceHome } from '../../features/workspace/components/WorkspaceHome.jsx';
import { WorkspaceShell } from '../../features/workspace/components/WorkspaceShell.jsx';
import { DevelopersView } from '../../features/developers/index.js';
import { ProfileView } from '../../features/profile/index.js';
import { ActivityFeedView, SavedItemsView, useSavedItems } from '../../features/user-system/index.js';
import { SettingsView } from '../../features/settings/index.js';
import { SecurityView } from '../../features/security/index.js';
import { useWorkspaceOverview } from '../../features/workspace/hooks/useWorkspaceOverview.js';

export function WorkspacePage({ api, user, section = 'dashboard', setView, onSignOut, children }) {
  const overview = useWorkspaceOverview(api);
  const savedItemsHook = useSavedItems(api);

  const navigate = (target) => {
    if (target === 'dashboard') setView({ name: 'dashboard' });
    else setView({ name: target });
  };

  return <WorkspaceShell api={api} active={section} user={user} onNavigate={navigate} onSignOut={onSignOut}>
    {children || null}
    {section === 'profile' ? <ProfileView api={api} user={user} overview={overview} onOpenProject={(projectId) => setView({ name: 'project-home', projectId })} /> : null}
    {section === 'settings' ? <SettingsView api={api} user={user} onSignOut={onSignOut} onNavigateToDevelopers={() => setView({ name: 'developers' })} /> : null}
    {section === 'security' ? <SecurityView api={api} onSignOut={onSignOut} /> : null}
    {section === 'projects' ? <ProjectsIndex api={api} overview={overview} onOpenProject={(projectId) => setView({ name: 'project-home', projectId })} /> : null}
    {section === 'activity' ? <ActivityFeedView api={api} onOpenProject={(projectId) => setView({ name: 'project-home', projectId })} /> : null}
    {section === 'saved-items' ? <SavedItemsView hook={savedItemsHook} onNavigate={setView} /> : null}
    {section === 'developers' ? <DevelopersView api={api} user={user} /> : null}
    {!children && !['profile', 'settings', 'security', 'projects', 'developers', 'activity', 'saved-items'].includes(section) ? <WorkspaceHome api={api} user={user} overview={overview} onOpenProject={(projectId) => setView({ name: 'project-home', projectId })} /> : null}
  </WorkspaceShell>;
}
