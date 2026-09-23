import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, Bot, Brain, ExternalLink, FolderKanban, GitBranch, Image as ImageIcon, Settings, Upload } from 'lucide-react';
import { Button, EmptyState, ErrorState, Input, LoadingState, Textarea, cn } from '@canopy/ui';
import { formatError, classifyError } from '../../../shared/api.js';
import { NotFoundState, ForbiddenState, ServerErrorState } from '../../../components/system/index.js';
import { buildProjectModel, formatRelativeTime, projectSubtitle, versionTitle } from '../services/projectData.js';
import { VersionHistory } from '../../versions/components/VersionHistory.jsx';
import { AssetBrowser } from '../../assets/index.js';
import { MemoryList } from '../../memory/index.js';
import { CopilotView } from '../../copilot/index.js';

const tabs = [
  { key: 'home', label: 'Home', icon: FolderKanban },
  { key: 'assets', label: 'Assets', icon: ImageIcon },
  { key: 'versions', label: 'Versions', icon: GitBranch },
  { key: 'memory', label: 'Memory', icon: Brain },
  { key: 'copilot', label: 'Copilot', icon: Bot },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'settings', label: 'Settings', icon: Settings }
];

export function ProjectHome({ api, projectId, tab = 'home', onNavigateProject, onBackToProjects, onOpenWorkbench, setView }) {
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => api.getProject(projectId) });
  const lineage = useQuery({ queryKey: ['lineage', projectId], queryFn: () => api.getLineage(projectId) });
  const model = useMemo(() => buildProjectModel(project.data, lineage.data), [project.data, lineage.data]);
  const active = tabs.some((item) => item.key === tab) ? tab : 'home';

  if (project.isLoading || lineage.isLoading) return <LoadingState label="Loading project" className="min-h-[50vh]" />;
  if (project.error) {
    const classified = classifyError(project.error);
    if (classified.type === 'not_found') return <div className="px-5 py-8 lg:px-8"><NotFoundState title="Project Not Found" description="This project could not be located in your workspace. It may have been archived or does not exist." onBack={onBackToProjects} /></div>;
    if (classified.type === 'forbidden') return <div className="px-5 py-8 lg:px-8"><ForbiddenState title="Access Restricted" description="You don't have permission to view this project." onHome={onBackToProjects} homeLabel="Back to Projects" /></div>;
    if (classified.type === 'server_error') return <div className="px-5 py-8 lg:px-8"><ServerErrorState description={classified.message} onRetry={() => project.refetch()} onHome={onBackToProjects} homeLabel="Back to Projects" /></div>;
    return <div className="px-5 py-8 lg:px-8"><ErrorState message={formatError(project.error, 'Could not load this project.')} onRetry={() => project.refetch()} /></div>;
  }


  return <div className="px-5 py-8 lg:px-8">
    <button className="mb-6 inline-flex items-center gap-2 text-sm text-canopy-secondary hover:text-white" onClick={onBackToProjects}><ArrowLeft className="h-4 w-4" />Projects</button>
    <header className="flex flex-col gap-5 border-b border-canopy-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">Project</p>
        <h1 className="mt-3 truncate text-3xl font-semibold text-white">{project.data.name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-canopy-secondary">{projectSubtitle(project.data)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onOpenWorkbench}><ExternalLink className="mr-2 h-4 w-4" />Open workbench</Button>
      </div>
    </header>

    <nav className="mt-5 flex flex-wrap gap-2" aria-label="Project navigation">
      {tabs.map((item) => {
        const Icon = item.icon;
        return <button key={item.key} onClick={() => onNavigateProject(item.key)} className={cn('inline-flex h-9 items-center gap-2 border px-3 text-sm transition', active === item.key ? 'border-canopy-green bg-canopy-green/10 text-white' : 'border-canopy-border text-canopy-secondary hover:bg-canopy-surface hover:text-white')}><Icon className="h-4 w-4" />{item.label}</button>;
      })}
    </nav>

    {active === 'home' ? <ProjectOverview model={model} lineageError={lineage.error} onOpenWorkbench={onOpenWorkbench} /> : null}
    {active === 'assets' ? <div className="mt-8"><AssetBrowser api={api} projectId={projectId} onOpenWorkbench={onOpenWorkbench} /></div> : null}
    {active === 'versions' ? <VersionHistory api={api} projectId={projectId} onOpenWorkbench={onOpenWorkbench} /> : null}
    {active === 'memory' ? <div className="mt-8"><MemoryList api={api} projectId={projectId} onOpenWorkbench={onOpenWorkbench} /></div> : null}
    {active === 'copilot' ? <CopilotView api={api} projectId={projectId} onOpenWorkbench={onOpenWorkbench} onNavigateProject={onNavigateProject} /> : null}
    {active === 'activity' ? <ProjectActivity model={model} /> : null}
    {active === 'settings' ? <ProjectSettings api={api} project={project.data} onArchived={onBackToProjects} /> : null}
  </div>;
}

function ProjectOverview({ model, lineageError, onOpenWorkbench }) {
  const stats = [
    ['Versions', model.versionCount],
    ['Latest', model.latestVersion ? versionTitle(model.latestVersion) : 'None'],
    ['Updated', formatRelativeTime(model.lastActivityAt)]
  ];

  return <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
    <section className="min-w-0">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-canopy-muted">Project Home</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => <div key={label} className="border border-canopy-border bg-canopy-surface p-4"><p className="text-xs text-canopy-muted">{label}</p><p className="mt-2 truncate text-xl font-semibold text-white">{value}</p></div>)}
      </div>
      {lineageError ? <ErrorState className="mt-6" message={formatError(lineageError, 'Could not load project lineage.')} /> : null}
      {model.latestVersion ? <div className="mt-8 border-y border-canopy-border py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Latest version</p>
        <h3 className="mt-3 text-xl font-semibold text-white">{versionTitle(model.latestVersion)}</h3>
        <p className="mt-2 text-sm text-canopy-secondary">{model.latestVersion.action_type || model.latestVersion.action?.type || 'version'} · {formatRelativeTime(model.latestVersion.created_at)}</p>
        <Button className="mt-5" onClick={onOpenWorkbench}>Continue in workbench</Button>
      </div> : <EmptyState className="mt-8" title="No versions yet" description="Open the workbench to upload the first project asset and create V1." action={<Button onClick={onOpenWorkbench}>Open workbench</Button>} />}
    </section>
    <aside className="border border-canopy-border bg-canopy-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-canopy-muted">Recent Activity</h2>
      {model.activity.length ? <ol className="mt-4 space-y-4">{model.activity.slice(0, 5).map((item) => <li key={item.id} className="border-l border-canopy-border pl-3"><p className="text-sm font-semibold text-white">{item.action}</p><p className="mt-1 text-xs text-canopy-secondary">{versionTitle(item.version)} · {formatRelativeTime(item.timestamp)}</p></li>)}</ol> : <p className="mt-4 text-sm text-canopy-secondary">No lineage activity yet.</p>}
    </aside>
  </div>;
}

function ProjectActivity({ model }) {
  return <section className="mt-8 max-w-3xl">
    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-canopy-muted">Activity</h2>
    {model.activity.length ? <ol className="mt-5 divide-y divide-canopy-border border-y border-canopy-border">{model.activity.map((item) => <li key={item.id} className="py-4"><p className="text-base font-semibold text-white">{item.action}</p><p className="mt-1 text-sm text-canopy-secondary">{versionTitle(item.version)} · {formatRelativeTime(item.timestamp)}</p></li>)}</ol> : <EmptyState className="mt-5" title="No project activity" description="Activity appears after versions are imported or committed." />}
  </section>;
}

function ProjectSettings({ api, project, onArchived }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name || '');
  const [creativeGoal, setCreativeGoal] = useState(project.creative_goal || '');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');

  const updateProject = useMutation({
    mutationFn: () => api.updateProject(project.id, { name: name.trim(), creative_goal: creativeGoal.trim() || null }),
    async onSuccess(updated) {
      setMessage('Project settings saved.');
      queryClient.setQueryData(['project', project.id], updated);
      await queryClient.invalidateQueries({ queryKey: ['workspace-overview'] });
    },
    onError(error) {
      setMessage(formatError(error, 'Could not save project settings.'));
    }
  });

  const archiveProject = useMutation({
    mutationFn: () => api.archiveProject(project.id),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['workspace-overview'] });
      onArchived();
    },
    onError(error) {
      setMessage(formatError(error, 'Could not archive this project.'));
    }
  });

  return <section className="mt-8 max-w-2xl space-y-8">
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-canopy-muted">Settings</h2>
      <div className="mt-4 space-y-3 border border-canopy-border bg-canopy-surface p-4">
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        <Textarea value={creativeGoal} onChange={(event) => setCreativeGoal(event.target.value)} rows={5} placeholder="Creative goal" maxLength={1000} />
        {message ? <p className="text-sm text-canopy-secondary">{message}</p> : null}
        <Button disabled={!name.trim() || updateProject.isPending} onClick={() => updateProject.mutate()}>{updateProject.isPending ? 'Saving...' : 'Save project'}</Button>
      </div>
    </div>
    <div className="border border-rose-500/30 bg-rose-500/10 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-200">Archive project</h3>
      <p className="mt-3 text-sm leading-6 text-canopy-secondary">Archiving removes this project from active project lists. Existing version history remains in the database.</p>
      <Input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={`Type ${project.name} to confirm`} className="mt-4" />
      <Button variant="danger" className="mt-3" disabled={confirm !== project.name || archiveProject.isPending} onClick={() => archiveProject.mutate()}>{archiveProject.isPending ? 'Archiving...' : 'Archive project'}</Button>
    </div>
  </section>;
}
