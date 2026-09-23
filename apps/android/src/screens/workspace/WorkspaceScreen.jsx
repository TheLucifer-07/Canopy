import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CanopyLogo } from '../../components/branding/CanopyLogo.jsx';
import { AppIcon } from '../../components/icons/AppIcon.jsx';
import { ErrorState as SystemErrorState, LoadingState as SystemLoadingState, EmptyState as SystemEmptyState } from '../../components/system/index.js';
import { createCanopyApi } from '../../api.js';
import { buildWorkspaceModel, formatRelativeTime, versionTitle } from '../../features/workspace/workspaceData.js';
import { SettingsSection } from '../../features/workspace/SettingsSection.jsx';
import { theme } from '../../theme/index.js';

export function WorkspaceScreen({ session, user, onLogout }) {
  const api = useMemo(() => createCanopyApi(session?.access_token), [session?.access_token]);
  const [state, setState] = useState({ status: 'loading', projects: [], lineagesByProject: {}, notifications: [], savedItems: [], activities: [], error: '' });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectTab, setProjectTab] = useState('home');
  const [projectName, setProjectName] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState('');

  async function load() {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const [projRes, notifRes, savedRes, actRes] = await Promise.all([
        api.listProjects({ limit: 25 }).catch(() => ({ data: [] })),
        api.listNotifications({ limit: 10 }).catch(() => ({ data: [] })),
        api.listSavedItems().catch(() => ({ data: [] })),
        api.getActivity({ limit: 15 }).catch(() => ({ data: [] }))
      ]);
      const projects = projRes.data || [];
      const lineagePairs = await Promise.all(projects.map(async (project) => [project.id, await api.getLineage(project.id).catch(() => null)]));
      setState({
        status: 'ready',
        projects,
        lineagesByProject: Object.fromEntries(lineagePairs.filter(([, v]) => Boolean(v))),
        notifications: notifRes.data || [],
        savedItems: savedRes.data || [],
        activities: actRes.data || [],
        error: ''
      });
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error?.error?.message || error?.message || 'Could not load your workspace.' }));
    }
  }

  async function createProject() {
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      await api.createProject({ name: projectName.trim(), creative_goal: projectGoal.trim() || null });
      setProjectName('');
      setProjectGoal('');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error?.error?.message || error?.message || 'Could not create project.' }));
    } finally {
      setCreating(false);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch (err) {
      // quiet fallback
    }
  }

  async function unsaveItem(id) {
    try {
      await api.unsaveItem(id);
      await load();
    } catch (err) {
      // quiet fallback
    }
  }

  useEffect(() => {
    load();
  }, [api]);

  const model = useMemo(() => buildWorkspaceModel(state.projects, state.lineagesByProject), [state.projects, state.lineagesByProject]);
  const selectedProject = model.projects.find((project) => project.id === selectedProjectId) || null;

  async function saveSelectedProject({ name, creativeGoal }) {
    if (!selectedProject || !name.trim()) return;
    setSavingProject(true);
    try {
      await api.updateProject(selectedProject.id, { name: name.trim(), creative_goal: creativeGoal.trim() || null });
      await load();
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error?.error?.message || error?.message || 'Could not save project settings.' }));
    } finally {
      setSavingProject(false);
    }
  }

  async function archiveSelectedProject() {
    if (!selectedProject || archiveConfirm !== selectedProject.name) return;
    setSavingProject(true);
    try {
      await api.archiveProject(selectedProject.id);
      setSelectedProjectId(null);
      setProjectTab('home');
      setArchiveConfirm('');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error?.error?.message || error?.message || 'Could not archive project.' }));
    } finally {
      setSavingProject(false);
    }
  }

  if (selectedProject) {
    return <ProjectDetail
      project={selectedProject}
      tab={projectTab}
      onTab={setProjectTab}
      onBack={() => { setSelectedProjectId(null); setProjectTab('home'); setArchiveConfirm(''); }}
      onSave={saveSelectedProject}
      onArchive={archiveSelectedProject}
      saving={savingProject}
      archiveConfirm={archiveConfirm}
      setArchiveConfirm={setArchiveConfirm}
    />;
  }

  return <View style={styles.safe}>
    <View style={styles.header}><CanopyLogo /><View style={styles.headerIdentity}><Avatar email={user?.email} /><Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout} style={styles.iconButton}><Text style={styles.logoutText}>Log out</Text></Pressable></View></View>
    <ScrollView refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={load} tintColor={theme.colors.green} />} contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>Creative Workspace</Text>
      <Text style={styles.title}>Projects, versions, and recent creative activity</Text>
      <Text style={styles.body}>{user?.email ? `${user.email} owns this workspace. ` : ''}Continue recent projects and inspect creative changes from real Canopy API data.</Text>
      <ProfileSummary user={user} model={model} />
      <NotificationsSection notifications={state.notifications} onMarkAllRead={markAllNotificationsRead} />
      <SavedItemsSection items={state.savedItems} onUnsave={unsaveItem} />
      <View style={styles.quickAction}>
        <Text style={styles.sectionTitle}>Create project</Text>
        <TextInput value={projectName} onChangeText={setProjectName} placeholder="Project name" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TextInput value={projectGoal} onChangeText={setProjectGoal} placeholder="Creative goal" placeholderTextColor={theme.colors.muted} multiline style={[styles.input, styles.textarea]} />
        <Pressable accessibilityRole="button" disabled={!projectName.trim() || creating} onPress={createProject} style={[styles.primary, (!projectName.trim() || creating) && styles.disabled]}>{creating ? <ActivityIndicator color="#06251A" /> : <AppIcon name="features" size={18} color="#06251A" />}<Text style={styles.primaryText}>Create project</Text></Pressable>
      </View>
      {state.status === 'error' ? <ErrorBlock message={state.error} onRetry={load} /> : null}
      {state.status === 'loading' && !state.projects.length ? <LoadingBlock /> : null}
      {state.status !== 'loading' && !state.projects.length && !state.error ? <EmptyBlock /> : null}
      {model.projects.length ? <RecentProjects projects={model.projects} onOpen={(projectId) => setSelectedProjectId(projectId)} /> : null}
      {model.recentVersions.length ? <RecentVersions versions={model.recentVersions} /> : null}
      {state.activities.length ? <ActivityFeed activity={state.activities} /> : (model.activity.length ? <ActivityFeed activity={model.activity} /> : null)}
      <DeveloperMcpSection />
      <SettingsSection api={api} user={user} />
    </ScrollView>
  </View>;
}

function NotificationsSection({ notifications, onMarkAllRead }) {
  const unread = notifications.filter((n) => !n.read_at);
  return <Section title={`Notifications (${unread.length} unread)`}>
    {notifications.length ? (
      <View>
        {unread.length > 0 && (
          <Pressable accessibilityRole="button" onPress={onMarkAllRead} style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
            <Text style={styles.inlineActionText}>Mark all read</Text>
          </Pressable>
        )}
        {notifications.map((n) => (
          <View key={n.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, !n.read_at && { color: '#fff' }]}>{n.title}</Text>
              {n.message ? <Text style={styles.rowBody}>{n.message}</Text> : null}
              <Text style={styles.rowMeta}>{formatRelativeTime(n.created_at)}</Text>
            </View>
            {!n.read_at && <View style={styles.dot} />}
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.rowBody}>No notifications.</Text>
    )}
  </Section>;
}

function SavedItemsSection({ items, onUnsave }) {
  return <Section title={`Saved Items (${items.length})`}>
    {items.length ? (
      <View>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.metadata?.name || item.metadata?.statement || `Saved ${item.entity_type}`}</Text>
              <Text style={styles.rowMeta}>{item.entity_type} · {formatRelativeTime(item.created_at)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove saved item" onPress={() => onUnsave(item.id)} style={styles.inlineAction}>
              <Text style={styles.inlineActionText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.rowBody}>You haven't saved anything yet.</Text>
    )}
  </Section>;
}

function DeveloperMcpSection() {
  return <Section title="Developer & MCP">
    <View style={styles.row}>
      <View style={styles.rowIcon}><AppIcon name="features" size={18} /></View>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>Model Context Protocol (MCP)</Text>
        <Text style={styles.rowBody}>9 safe read-only tools exposed for Claude Desktop, Cursor, and AI agents. Personal Access Tokens can be generated in the Web dashboard.</Text>
        <Text style={styles.rowMeta}>Endpoint: http://localhost:3000/v1 · MCP v0.1.0</Text>
      </View>
    </View>
  </Section>;
}

function ProjectDetail({ project, tab, onTab, onBack, onSave, onArchive, saving, archiveConfirm, setArchiveConfirm }) {
  const [name, setName] = useState(project.name || '');
  const [creativeGoal, setCreativeGoal] = useState(project.creative_goal || '');

  useEffect(() => {
    setName(project.name || '');
    setCreativeGoal(project.creative_goal || '');
  }, [project.id, project.name, project.creative_goal]);

  return <View style={styles.safe}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton}><Text style={styles.logoutText}>Projects</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onTab('home')}><CanopyLogo /></Pressable></View>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>Project</Text>
      <Text style={styles.title}>{project.name}</Text>
      <Text style={styles.body}>{project.creative_goal || 'No creative goal set'}</Text>
      <View style={styles.tabRow}>
        {['home', 'activity', 'settings'].map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => onTab(item)} style={[styles.tabButton, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}
      </View>
      {tab === 'home' ? <ProjectHomeSection project={project} /> : null}
      {tab === 'activity' ? <ProjectActivitySection project={project} /> : null}
      {tab === 'settings' ? <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Project name" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TextInput value={creativeGoal} onChangeText={setCreativeGoal} placeholder="Creative goal" placeholderTextColor={theme.colors.muted} multiline style={[styles.input, styles.textarea]} />
        <Pressable accessibilityRole="button" disabled={!name.trim() || saving} onPress={() => onSave({ name, creativeGoal })} style={[styles.primary, (!name.trim() || saving) && styles.disabled]}>{saving ? <ActivityIndicator color="#06251A" /> : <AppIcon name="features" size={18} color="#06251A" />}<Text style={styles.primaryText}>Save project</Text></Pressable>
        <View style={styles.dangerPanel}>
          <Text style={styles.panelTitle}>Archive project</Text>
          <Text style={styles.rowBody}>Archiving removes this project from active project lists while preserving stored history.</Text>
          <TextInput value={archiveConfirm} onChangeText={setArchiveConfirm} placeholder={`Type ${project.name}`} placeholderTextColor={theme.colors.muted} style={styles.input} />
          <Pressable accessibilityRole="button" disabled={archiveConfirm !== project.name || saving} onPress={onArchive} style={[styles.dangerButton, (archiveConfirm !== project.name || saving) && styles.disabled]}><Text style={styles.dangerText}>Archive project</Text></Pressable>
        </View>
      </View> : null}
    </ScrollView>
  </View>;
}

function ProjectHomeSection({ project }) {
  return <Section title="Project Home">
    <View style={styles.row}><View style={styles.rowMain}><Text style={styles.rowTitle}>{project.versionCount} version{project.versionCount === 1 ? '' : 's'}</Text><Text style={styles.rowBody}>Updated {formatRelativeTime(project.lastActivityAt)}</Text></View><Text style={styles.versionPill}>{project.latestVersion ? versionTitle(project.latestVersion) : 'New'}</Text></View>
    {!project.latestVersion ? <Text style={styles.rowBody}>Image import is available in the web workbench for this phase.</Text> : null}
  </Section>;
}

function ProjectActivitySection({ project }) {
  const activity = project.versions.map((version) => ({ id: version.id, action: version.is_root ? 'Project asset imported' : `${version.action_type || 'Creative'} version created`, version, timestamp: version.created_at })).reverse();
  return <Section title="Activity">{activity.length ? activity.map((item) => <View key={item.id} style={styles.activity}><View style={styles.dot} /><View style={styles.rowMain}><Text style={styles.rowTitle}>{item.action}</Text><Text style={styles.rowMeta}>{versionTitle(item.version)} · {formatRelativeTime(item.timestamp)}</Text></View></View>) : <Text style={styles.rowBody}>No project activity yet.</Text>}</Section>;
}

function RecentProjects({ projects, onOpen }) {
  return <Section title="Recent Projects">{projects.map((project) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${project.name}`} onPress={() => onOpen(project.id)} key={project.id} style={styles.row}><View style={styles.rowMain}><Text style={styles.rowTitle}>{project.name}</Text><Text style={styles.rowBody}>{project.creative_goal || 'No creative goal set'}</Text><Text style={styles.rowMeta}>{project.versionCount} version{project.versionCount === 1 ? '' : 's'} · Updated {formatRelativeTime(project.lastActivityAt)}</Text></View><Text style={styles.versionPill}>{project.latestVersion ? versionTitle(project.latestVersion) : 'New'}</Text></Pressable>)}</Section>;
}

function RecentVersions({ versions }) {
  return <Section title="Recent Versions">{versions.map((version) => <View key={version.id} style={styles.row}><View style={styles.rowIcon}><AppIcon name={version.actor_type === 'model' ? 'sparkles' : 'how'} size={18} /></View><View style={styles.rowMain}><Text style={styles.rowTitle}>{versionTitle(version)}</Text><Text style={styles.rowBody}>{version.project.name}</Text><Text style={styles.rowMeta}>{version.action_type || 'version'} · {formatRelativeTime(version.created_at)}</Text></View></View>)}</Section>;
}

function ActivityFeed({ activity }) {
  return <Section title="Creative Activity">{activity.map((item) => <View key={item.id} style={styles.activity}><View style={styles.dot} /><View style={styles.rowMain}><Text style={styles.rowTitle}>{item.action}</Text><Text style={styles.rowMeta}>{item.projectName} · {versionTitle(item.version)} · {formatRelativeTime(item.timestamp)}</Text></View></View>)}</Section>;
}

function Section({ title, children }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function LoadingBlock() {
  return <SystemLoadingState label="Loading workspace" />;
}

function EmptyBlock() {
  return <SystemEmptyState title="Your creative workspace is empty" description="Create your first project to start preserving creative history." />;
}

function ErrorBlock({ message, onRetry }) {
  return <SystemErrorState title="Could not load your workspace" message={message} onRetry={onRetry} />;
}

function ProfileSummary({ user, model }) {
  const email = user?.email || 'Canopy profile';
  const handle = user?.email ? `@${user.email.split('@')[0]}` : '@canopy-user';
  return <View style={styles.profile}>
    <Avatar email={user?.email} large />
    <View style={styles.profileCopy}>
      <Text style={styles.profileName}>{email}</Text>
      <Text style={styles.profileHandle}>{handle}</Text>
      <Text style={styles.profileMeta}>{model.projects.length} project{model.projects.length === 1 ? '' : 's'} · {model.recentVersions.length} recent version{model.recentVersions.length === 1 ? '' : 's'}</Text>
    </View>
  </View>;
}

function Avatar({ email, large = false }) {
  const initial = (email || 'C').trim().charAt(0).toUpperCase();
  return <View style={[styles.avatar, large && styles.avatarLarge]}><Text style={[styles.avatarText, large && styles.avatarTextLarge]}>{initial}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  iconButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  logoutText: { color: theme.colors.secondary, fontWeight: '700' },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  eyebrow: { color: theme.colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: theme.colors.text, marginTop: theme.spacing.md, fontSize: 30, lineHeight: 37, fontWeight: '800' },
  body: { color: theme.colors.muted, marginTop: theme.spacing.sm, fontSize: 15, lineHeight: 23 },
  profile: { marginTop: theme.spacing.xl, flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.sm },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  profileHandle: { color: theme.colors.secondary, marginTop: 2, fontSize: 13 },
  profileMeta: { color: theme.colors.muted, marginTop: 6, fontSize: 12 },
  avatar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(67, 211, 145, 0.4)', backgroundColor: 'rgba(67, 211, 145, 0.1)' },
  avatarLarge: { width: 48, height: 48 },
  avatarText: { color: theme.colors.green, fontWeight: '800', fontSize: 13 },
  avatarTextLarge: { fontSize: 18 },
  quickAction: { marginTop: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.sm, gap: theme.spacing.md },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.elevated, borderRadius: theme.radius.sm, color: theme.colors.text, paddingHorizontal: theme.spacing.md },
  textarea: { minHeight: 92, paddingTop: theme.spacing.md, textAlignVertical: 'top' },
  primary: { minHeight: 48, flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.green, borderRadius: theme.radius.sm },
  primaryText: { color: '#06251A', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  section: { marginTop: theme.spacing.xl },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: theme.spacing.md },
  rowIcon: { width: 34, height: 34, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  rowBody: { color: theme.colors.secondary, marginTop: 4, fontSize: 14, lineHeight: 21 },
  rowMeta: { color: theme.colors.muted, marginTop: 6, fontSize: 12 },
  versionPill: { color: theme.colors.green, fontFamily: 'monospace', fontSize: 12, marginTop: 2 },
  activity: { flexDirection: 'row', gap: theme.spacing.md, borderLeftWidth: 1, borderLeftColor: theme.colors.border, paddingLeft: theme.spacing.md, paddingVertical: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.green, marginTop: 6 },
  panel: { marginTop: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.sm, alignItems: 'center' },
  errorPanel: { marginTop: theme.spacing.xl, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: 'rgba(244, 63, 94, 0.12)', padding: theme.spacing.lg, borderRadius: theme.radius.sm },
  panelTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  centerText: { color: theme.colors.secondary, marginTop: theme.spacing.sm },
  retry: { marginTop: theme.spacing.md, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm },
  retryText: { color: theme.colors.text, fontWeight: '800' },
  inlineAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  inlineActionText: { color: theme.colors.secondary, fontSize: 12, fontWeight: '700' },
  tabRow: { marginTop: theme.spacing.xl, flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  tabButton: { minHeight: 38, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm },
  tabActive: { borderColor: theme.colors.green, backgroundColor: 'rgba(67, 211, 145, 0.1)' },
  tabText: { color: theme.colors.secondary, fontWeight: '800', textTransform: 'capitalize' },
  tabTextActive: { color: theme.colors.text },
  dangerPanel: { marginTop: theme.spacing.xl, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: 'rgba(244, 63, 94, 0.12)', padding: theme.spacing.md, borderRadius: theme.radius.sm, gap: theme.spacing.md },
  dangerButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.red, borderRadius: theme.radius.sm },
  dangerText: { color: '#fff', fontWeight: '800' }
});
