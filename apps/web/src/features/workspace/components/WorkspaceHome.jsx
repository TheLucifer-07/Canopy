import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Bot, GitCommit, Loader2, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import { Button, EmptyState, Input, Textarea } from '@canopy/ui';
import { formatRelativeTime, versionTitle } from '../services/workspaceData.js';

export function WorkspaceHome({ api, user, overview, onOpenProject }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [creativeGoal, setCreativeGoal] = useState('');
  const [query, setQuery] = useState('');
  const createProject = useMutation({
    mutationFn: () => api.createProject({ name: name.trim(), creative_goal: creativeGoal.trim() || undefined }),
    onSuccess(project) {
      setName('');
      setCreativeGoal('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onOpenProject(project.id);
    }
  });

  const filteredProjects = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return overview.model.projects;
    return overview.model.projects.filter((project) => `${project.name} ${project.creative_goal || ''}`.toLowerCase().includes(value));
  }, [overview.model.projects, query]);

  if (overview.error) return <WorkspaceError onRetry={overview.refetch} />;

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          <div className="border-b border-canopy-border pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Creative Workspace</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Projects, versions, and recent creative activity</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-canopy-muted">{user?.email ? `${user.email} owns this workspace. ` : ''}Continue recent projects, inspect creative versions, and pick up the thread where the work last changed.</p>
            </div>
          </div>

          {overview.isLoading ? <WorkspaceSkeleton /> : overview.isEmpty ? <WorkspaceEmptyState name={name} setName={setName} creativeGoal={creativeGoal} setCreativeGoal={setCreativeGoal} createProject={createProject} /> : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="space-y-6">
                <ProjectSearch value={query} onChange={setQuery} />
                <RecentProjects projects={filteredProjects} onOpenProject={onOpenProject} />
              </div>
              <div className="space-y-6">
                <RecentVersions versions={overview.model.recentVersions} onOpenProject={onOpenProject} />
                <ActivityFeed activity={overview.model.activity} onOpenProject={onOpenProject} />
              </div>
            </div>
          )}
        </section>
        <QuickActions
          name={name}
          setName={setName}
          creativeGoal={creativeGoal}
          setCreativeGoal={setCreativeGoal}
          createProject={createProject}
          latestProject={overview.model.projects[0]}
          onOpenProject={onOpenProject}
        />
      </div>
    </div>
  );
}

function QuickActions({ name, setName, creativeGoal, setCreativeGoal, createProject, latestProject, onOpenProject }) {
  return <aside className="rounded-md border border-canopy-border bg-canopy-surface p-5">
    <h2 className="text-sm font-semibold text-white">Quick actions</h2>
    <p className="mt-2 text-sm leading-6 text-canopy-muted">Create a project or jump into the most recent workspace context.</p>
    <div className="mt-5 space-y-3">
      <div><label className="mb-1.5 block text-xs font-medium text-canopy-secondary" htmlFor="workspace-project-name">Project name</label><Input id="workspace-project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Neon Campaign" /></div>
      <div><label className="mb-1.5 block text-xs font-medium text-canopy-secondary" htmlFor="workspace-project-goal">Creative goal</label><Textarea id="workspace-project-goal" value={creativeGoal} onChange={(event) => setCreativeGoal(event.target.value)} placeholder="Campaign direction, visual system, asset family..." className="h-20" /></div>
      <Button className="w-full" disabled={!name.trim() || createProject.isPending} onClick={() => createProject.mutate()}>
        {createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Create project
      </Button>
      {latestProject ? <Button variant="outline" className="w-full" onClick={() => onOpenProject(latestProject.id)}><ArrowRight className="mr-2 h-4 w-4" />Open recent project</Button> : null}
    </div>
  </aside>;
}

function ProjectSearch({ value, onChange }) {
  return <label className="flex items-center gap-2 rounded-md border border-canopy-border bg-canopy-elevated px-3 py-2">
    <span className="sr-only">Search projects</span>
    <Search className="h-4 w-4 text-canopy-muted" />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search projects by name or goal" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-canopy-muted" />
  </label>;
}

function RecentProjects({ projects, onOpenProject }) {
  return <Section title="Recent projects" description="Creative projects ordered by real project and version activity.">
    {projects.length ? <div className="divide-y divide-canopy-border border-y border-canopy-border">{projects.map((project) => <button key={project.id} className="group grid w-full gap-3 rounded-sm px-2 py-4 text-left transition hover:bg-canopy-surface sm:grid-cols-[1fr_auto]" onClick={() => onOpenProject(project.id)}>
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-white">{project.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-canopy-muted">{project.creative_goal || 'No creative goal set'}</p>
        <p className="mt-2 text-xs text-canopy-muted">Updated {formatRelativeTime(project.lastActivityAt)}</p>
      </div>
      <div className="flex items-center gap-6 text-sm text-canopy-secondary sm:justify-end">
        <span>{project.versionCount} version{project.versionCount === 1 ? '' : 's'}</span>
        <span className="font-mono text-xs text-canopy-green">{project.latestVersion ? versionTitle(project.latestVersion) : 'No versions'}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </button>)}</div> : <EmptyState title="No matching projects" description="Try a different project name or creative goal." />}
  </Section>;
}

function RecentVersions({ versions, onOpenProject }) {
  return <Section title="Recent versions" description="Latest creative changes across your projects.">
    {versions.length ? <div className="divide-y divide-canopy-border">{versions.map((version) => <button key={version.id} className="flex w-full items-start gap-3 rounded-sm px-2 py-3 text-left hover:bg-canopy-surface" onClick={() => onOpenProject(version.project.id)}>
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-canopy-border bg-canopy-bg text-canopy-muted"><GitCommit className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-sm font-semibold text-white">{versionTitle(version)}</h3><span className="shrink-0 text-xs text-canopy-muted">{formatRelativeTime(version.created_at)}</span></div><p className="mt-1 truncate text-xs text-canopy-secondary">{version.project.name} · {version.action_type || 'version'} · {version.actor_type || 'unknown'}</p></div>
    </button>)}</div> : <EmptyState title="No versions yet" description="Import an asset in a project to create the first creative version." />}
  </Section>;
}

function ActivityFeed({ activity, onOpenProject }) {
  return <Section title="Creative activity" description="Real project activity derived from version history.">
    {activity.length ? <ol className="space-y-3">{activity.map((item) => <li key={item.id}><button className="flex w-full gap-3 border-l border-canopy-border py-1 pl-3 text-left hover:border-canopy-green" onClick={() => onOpenProject(item.projectId)}><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-canopy-green" /><span className="min-w-0"><span className="block text-sm font-medium text-white">{item.action}</span><span className="mt-1 block text-xs text-canopy-secondary">{item.projectName} · {versionTitle(item.version)} · {formatRelativeTime(item.timestamp)}</span></span></button></li>)}</ol> : <EmptyState title="No recent creative activity" description="Project activity will appear here as you create versions, branches, and merges." />}
  </Section>;
}

function WorkspaceEmptyState({ name, setName, creativeGoal, setCreativeGoal, createProject }) {
  return <div className="mt-8 rounded-md border border-canopy-border bg-canopy-surface p-8"><EmptyState icon={<Upload className="h-8 w-8" />} title="Your creative workspace is empty" description="Create your first project to start preserving creative history." className="border-0 bg-transparent p-0" /><div className="mx-auto mt-6 grid max-w-xl gap-3"><label><span className="mb-1.5 block text-xs font-medium text-canopy-muted">Project name</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Neon Campaign" /></label><label><span className="mb-1.5 block text-xs font-medium text-canopy-muted">Creative goal</span><Textarea value={creativeGoal} onChange={(event) => setCreativeGoal(event.target.value)} placeholder="Campaign direction, visual system, asset family..." className="h-20" /></label><Button disabled={!name.trim() || createProject.isPending} onClick={() => createProject.mutate()}>{createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Create project</Button></div></div>;
}

function WorkspaceError({ onRetry }) {
  return <div className="px-5 py-10 lg:px-8"><div className="max-w-xl rounded-md border border-[#F43F5E]/35 bg-[#F43F5E]/10 p-6"><AlertCircle className="h-6 w-6 text-rose-200" /><h1 className="mt-4 text-xl font-semibold text-white">Could not load your workspace</h1><p className="mt-2 text-sm leading-6 text-rose-100">We could not retrieve your latest projects and activity.</p><Button className="mt-5" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div></div>;
}

function WorkspaceSkeleton() {
  return <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"><div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-md border border-canopy-border bg-canopy-surface" />)}</div><div className="space-y-3">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-md border border-canopy-border bg-canopy-surface" />)}</div></div>;
}

function Section({ title, description, children }) {
  return <section><div className="mb-3"><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-canopy-muted">{description}</p></div>{children}</section>;
}
