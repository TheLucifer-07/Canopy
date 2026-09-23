import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, FolderKanban, Import, Plus, Search } from 'lucide-react';
import { Button, EmptyState, ErrorState, Input, LoadingState, Textarea } from '@canopy/ui';
import { formatError } from '../../../shared/api.js';
import { formatRelativeTime, projectSubtitle, versionTitle } from '../services/projectData.js';

const sortOptions = [
  { value: 'activity', label: 'Recent activity' },
  { value: 'name', label: 'Name' },
  { value: 'versions', label: 'Version count' }
];

export function ProjectsIndex({ api, overview, onOpenProject }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('activity');
  const [name, setName] = useState('');
  const [creativeGoal, setCreativeGoal] = useState('');
  const [formError, setFormError] = useState('');

  const projects = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = overview.model.projects.filter((project) => {
      if (!needle) return true;
      return `${project.name} ${project.creative_goal || ''}`.toLowerCase().includes(needle);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'versions') return (b.versionCount || 0) - (a.versionCount || 0);
      return new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0);
    });
  }, [overview.model.projects, search, sort]);

  const createProject = useMutation({
    mutationFn: () => api.createProject({ name: name.trim(), creative_goal: creativeGoal.trim() || null }),
    async onSuccess(project) {
      setName('');
      setCreativeGoal('');
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['workspace-overview'] });
      onOpenProject(project.id);
    },
    onError(error) {
      setFormError(formatError(error, 'Could not create this project.'));
    }
  });

  function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    createProject.mutate();
  }

  return <div className="px-5 py-8 lg:px-8">
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <section className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Projects</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">All creative projects</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-canopy-muted">Create, search, and open real Canopy projects from your authenticated workspace.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" className="pl-9" />
            </label>
            <label className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-canopy-muted" />
              <span className="sr-only">Sort projects</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 w-full rounded-md border border-canopy-border bg-canopy-elevated pl-9 pr-8 text-sm text-white outline-none focus:border-canopy-green sm:w-44">
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {overview.isLoading ? <LoadingState label="Loading projects" className="mt-8" /> : null}
        {overview.error ? <ErrorState message={formatError(overview.error, 'Could not load projects.')} className="mt-8" /> : null}
        {!overview.isLoading && !overview.error && !projects.length ? <EmptyState className="mt-8" icon={<FolderKanban className="h-6 w-6" />} title="No projects match this view" description="Create a project or adjust search to see your real workspace projects." /> : null}
        {projects.length ? <div className="mt-8 divide-y divide-canopy-border border-y border-canopy-border">
          {projects.map((project) => <button key={project.id} className="grid w-full gap-4 rounded-sm px-2 py-5 text-left transition hover:bg-canopy-surface md:grid-cols-[1fr_160px_140px]" onClick={() => onOpenProject(project.id)}>
            <span className="min-w-0 px-1">
              <span className="block truncate text-lg font-semibold text-white">{project.name}</span>
              <span className="mt-1 block truncate text-sm text-canopy-secondary">{projectSubtitle(project)}</span>
            </span>
            <span className="px-1 text-sm text-canopy-secondary">{project.versionCount} version{project.versionCount === 1 ? '' : 's'}</span>
            <span className="px-1 text-sm text-canopy-muted">{project.latestVersion ? versionTitle(project.latestVersion) : formatRelativeTime(project.created_at)}</span>
          </button>)}
        </div> : null}
      </section>

      <aside className="w-full shrink-0 xl:w-80">
        <form onSubmit={submit} className="rounded-md border border-canopy-border bg-canopy-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Plus className="h-4 w-4 text-canopy-muted" />Create project</h2>
          <div className="mt-4 space-y-3">
            <label><span className="mb-1.5 block text-xs font-medium text-canopy-muted">Project name</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Neon Campaign" maxLength={120} /></label>
            <label><span className="mb-1.5 block text-xs font-medium text-canopy-muted">Creative goal</span><Textarea value={creativeGoal} onChange={(event) => setCreativeGoal(event.target.value)} placeholder="Campaign direction, visual system, asset family..." rows={4} maxLength={1000} /></label>
            {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
            <Button type="submit" className="w-full" disabled={createProject.isPending}>{createProject.isPending ? 'Creating...' : 'Create project'}</Button>
          </div>
        </form>
        <div className="mt-4 rounded-md border border-canopy-border bg-canopy-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Import className="h-4 w-4 text-canopy-muted" />Import</h2>
          <p className="mt-3 text-sm leading-6 text-canopy-muted">Import starts inside an opened project workbench because the current API accepts images only after a project exists.</p>
        </div>
      </aside>
    </div>
  </div>;
}
