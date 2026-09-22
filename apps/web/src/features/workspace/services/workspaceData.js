export function buildWorkspaceModel(projects = [], lineagesByProject = {}) {
  const projectSummaries = projects.map((project) => {
    const lineage = lineagesByProject[project.id] || { versions: [], edges: [] };
    const versions = [...(lineage.versions || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const latestVersion = versions.at(-1) || null;
    return {
      ...project,
      versions,
      versionCount: versions.length || project.version_sequence_counter || 0,
      latestVersion,
      lastActivityAt: latestVersion?.created_at || project.updated_at || project.created_at
    };
  }).sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));

  const recentVersions = projectSummaries
    .flatMap((project) => project.versions.map((version) => ({ ...version, project })))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);

  const activity = recentVersions.map((version) => ({
    id: version.id,
    projectId: version.project.id,
    projectName: version.project.name,
    version,
    action: activityLabel(version),
    timestamp: version.created_at
  }));

  return { projects: projectSummaries, recentVersions, activity };
}

export function activityLabel(version) {
  if (version.is_root) return 'Project asset imported';
  if (version.action_type === 'merge') return 'Creative directions merged';
  if (version.actor_type === 'model') return 'AI-assisted version created';
  if (version.action_type) return `${titleCase(version.action_type)} version created`;
  return 'Creative version created';
}

export function versionTitle(version) {
  const label = version.label || version.version_annotations?.[0]?.label;
  return label || `V${version.sequence || '?'}`;
}

export function formatRelativeTime(value) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

function titleCase(value) {
  return String(value).replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
