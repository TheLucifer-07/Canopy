import { activityLabel, formatRelativeTime, versionTitle } from '../../workspace/services/workspaceData.js';

export function buildProjectModel(project, lineage = {}) {
  const versions = [...(lineage.versions || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const latestVersion = versions.at(-1) || null;
  const activity = versions
    .map((version) => ({
      id: version.id,
      projectId: project?.id,
      projectName: project?.name,
      version,
      action: activityLabel(version),
      timestamp: version.created_at
    }))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return {
    project,
    versions,
    latestVersion,
    activity,
    versionCount: versions.length || project?.version_sequence_counter || 0,
    lastActivityAt: latestVersion?.created_at || project?.updated_at || project?.created_at
  };
}

export function projectSubtitle(project) {
  return project?.creative_goal || 'No creative goal set';
}

export { formatRelativeTime, versionTitle };
