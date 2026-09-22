import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { buildWorkspaceModel } from '../services/workspaceData.js';

export function useWorkspaceOverview(api) {
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => api.listProjects({ limit: 25 }) });
  const projects = projectsQuery.data?.data || [];
  const lineageQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ['lineage', project.id],
      queryFn: () => api.getLineage(project.id),
      enabled: Boolean(project.id)
    }))
  });

  const lineagesByProject = useMemo(() => {
    const entries = projects.map((project, index) => [project.id, lineageQueries[index]?.data]).filter(([, lineage]) => lineage);
    return Object.fromEntries(entries);
  }, [projects, lineageQueries]);

  const model = useMemo(() => buildWorkspaceModel(projects, lineagesByProject), [projects, lineagesByProject]);
  const lineagesLoading = lineageQueries.some((query) => query.isLoading);
  const lineagesError = lineageQueries.find((query) => query.isError)?.error || null;

  return {
    model,
    projects,
    isLoading: projectsQuery.isLoading || (projects.length > 0 && lineagesLoading),
    isEmpty: !projectsQuery.isLoading && projects.length === 0,
    error: projectsQuery.error || lineagesError,
    refetch: () => {
      projectsQuery.refetch();
      lineageQueries.forEach((query) => query.refetch?.());
    }
  };
}
