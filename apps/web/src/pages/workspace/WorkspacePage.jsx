import React from 'react';
import { Bot, Code2, FolderKanban, GitCommit, Library, Settings } from 'lucide-react';
import { EmptyState } from '@canopy/ui';
import { WorkspaceHome } from '../../features/workspace/components/WorkspaceHome.jsx';
import { WorkspaceShell } from '../../features/workspace/components/WorkspaceShell.jsx';
import { useWorkspaceOverview } from '../../features/workspace/hooks/useWorkspaceOverview.js';

const placeholders = {
  versions: ['Versions', GitCommit, 'Recent versions are already summarized on the workspace home. Open a project to inspect and compare its full lineage.'],
  memory: ['Memory', Library, 'Creative Memory is managed inside each project so memories remain tied to authorized project context.'],
  copilot: ['Copilot', Bot, 'Canopy Copilot is available inside project context where it can cite real lineage and memory evidence.'],
  developers: ['Developers', Code2, 'Developer documentation remains available from the public docs until authenticated developer settings are implemented.'],
  settings: ['Settings', Settings, 'Account and workspace settings are not implemented in this phase.'],
  docs: ['Documentation', FolderKanban, 'Open the public documentation from the marketing site for API, MCP, and architecture references.']
};

export function WorkspacePage({ api, user, section = 'dashboard', setView, onSignOut }) {
  const overview = useWorkspaceOverview(api);
  const navigate = (target) => {
    if (target === 'dashboard') setView({ name: 'dashboard' });
    else setView({ name: target });
  };

  return <WorkspaceShell active={section} user={user} onNavigate={navigate} onSignOut={onSignOut}>
    {section === 'dashboard' ? <WorkspaceHome api={api} overview={overview} onOpenProject={(projectId) => setView({ name: 'project', projectId })} /> : <WorkspacePlaceholder section={section} />}
  </WorkspaceShell>;
}

function WorkspacePlaceholder({ section }) {
  const [title, Icon, description] = placeholders[section] || placeholders.settings;
  return <div className="px-5 py-10 lg:px-8"><div className="max-w-2xl border border-canopy-border bg-canopy-surface p-8"><EmptyState icon={<Icon className="h-8 w-8" />} title={title} description={description} /></div></div>;
}
