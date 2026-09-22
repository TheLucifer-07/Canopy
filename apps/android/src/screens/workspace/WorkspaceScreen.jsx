import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CanopyLogo } from '../../components/branding/CanopyLogo.jsx';
import { AppIcon } from '../../components/icons/AppIcon.jsx';
import { createCanopyApi } from '../../api.js';
import { buildWorkspaceModel, formatRelativeTime, versionTitle } from '../../features/workspace/workspaceData.js';
import { theme } from '../../theme/index.js';

export function WorkspaceScreen({ session, user, onLogout }) {
  const api = useMemo(() => createCanopyApi(session?.access_token), [session?.access_token]);
  const [state, setState] = useState({ status: 'loading', projects: [], lineagesByProject: {}, error: '' });
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const response = await api.listProjects({ limit: 25 });
      const projects = response.data || [];
      const lineagePairs = await Promise.all(projects.map(async (project) => [project.id, await api.getLineage(project.id)]));
      setState({ status: 'ready', projects, lineagesByProject: Object.fromEntries(lineagePairs), error: '' });
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error?.error?.message || error?.message || 'Could not load your workspace.' }));
    }
  }

  async function createProject() {
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      await api.createProject({ name: projectName.trim() });
      setProjectName('');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error?.error?.message || error?.message || 'Could not create project.' }));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
  }, [api]);

  const model = useMemo(() => buildWorkspaceModel(state.projects, state.lineagesByProject), [state.projects, state.lineagesByProject]);

  return <View style={styles.safe}>
    <View style={styles.header}><CanopyLogo /><Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout} style={styles.iconButton}><Text style={styles.logoutText}>Log out</Text></Pressable></View>
    <ScrollView refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={load} tintColor={theme.colors.green} />} contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>Workspace</Text>
      <Text style={styles.title}>Your creative work, with its history intact.</Text>
      <Text style={styles.body}>{user?.email ? `${user.email} · ` : ''}Continue recent projects and inspect creative changes from real Canopy API data.</Text>
      <View style={styles.quickAction}>
        <Text style={styles.sectionTitle}>Create project</Text>
        <TextInput value={projectName} onChangeText={setProjectName} placeholder="Project name" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <Pressable accessibilityRole="button" disabled={!projectName.trim() || creating} onPress={createProject} style={[styles.primary, (!projectName.trim() || creating) && styles.disabled]}>{creating ? <ActivityIndicator color="#06251A" /> : <AppIcon name="features" size={18} color="#06251A" />}<Text style={styles.primaryText}>Create project</Text></Pressable>
      </View>
      {state.status === 'error' ? <ErrorBlock message={state.error} onRetry={load} /> : null}
      {state.status === 'loading' && !state.projects.length ? <LoadingBlock /> : null}
      {state.status !== 'loading' && !state.projects.length && !state.error ? <EmptyBlock /> : null}
      {model.projects.length ? <RecentProjects projects={model.projects} /> : null}
      {model.recentVersions.length ? <RecentVersions versions={model.recentVersions} /> : null}
      {model.activity.length ? <ActivityFeed activity={model.activity} /> : null}
    </ScrollView>
  </View>;
}

function RecentProjects({ projects }) {
  return <Section title="Recent Projects">{projects.map((project) => <View key={project.id} style={styles.row}><View style={styles.rowMain}><Text style={styles.rowTitle}>{project.name}</Text><Text style={styles.rowBody}>{project.creative_goal || 'No creative goal set'}</Text><Text style={styles.rowMeta}>{project.versionCount} version{project.versionCount === 1 ? '' : 's'} · Updated {formatRelativeTime(project.lastActivityAt)}</Text></View><Text style={styles.versionPill}>{project.latestVersion ? versionTitle(project.latestVersion) : 'New'}</Text></View>)}</Section>;
}

function RecentVersions({ versions }) {
  return <Section title="Recent Versions">{versions.map((version) => <View key={version.id} style={styles.row}><View style={styles.rowIcon}><AppIcon name={version.actor_type === 'model' ? 'sparkles' : 'how'} size={18} /></View><View style={styles.rowMain}><Text style={styles.rowTitle}>{versionTitle(version)}</Text><Text style={styles.rowBody}>{version.project.name}</Text><Text style={styles.rowMeta}>{version.action_type || 'version'} · {formatRelativeTime(version.created_at)}</Text></View></View>)}</Section>;
}

function ActivityFeed({ activity }) {
  return <Section title="Activity">{activity.map((item) => <View key={item.id} style={styles.activity}><View style={styles.dot} /><View style={styles.rowMain}><Text style={styles.rowTitle}>{item.action}</Text><Text style={styles.rowMeta}>{item.projectName} · {versionTitle(item.version)} · {formatRelativeTime(item.timestamp)}</Text></View></View>)}</Section>;
}

function Section({ title, children }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function LoadingBlock() {
  return <View style={styles.panel}><ActivityIndicator color={theme.colors.green} /><Text style={styles.centerText}>Loading workspace</Text></View>;
}

function EmptyBlock() {
  return <View style={styles.panel}><Text style={styles.panelTitle}>Your creative workspace is empty.</Text><Text style={styles.rowBody}>Create your first project to start preserving creative history.</Text></View>;
}

function ErrorBlock({ message, onRetry }) {
  return <View style={styles.errorPanel}><Text style={styles.panelTitle}>Could not load your workspace.</Text><Text style={styles.rowBody}>{message}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  logoutText: { color: theme.colors.secondary, fontWeight: '700' },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  eyebrow: { color: theme.colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: theme.colors.text, marginTop: theme.spacing.md, fontSize: 31, lineHeight: 38, fontWeight: '800' },
  body: { color: theme.colors.secondary, marginTop: theme.spacing.sm, fontSize: 15, lineHeight: 23 },
  quickAction: { marginTop: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.sm, gap: theme.spacing.md },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.elevated, borderRadius: theme.radius.sm, color: theme.colors.text, paddingHorizontal: theme.spacing.md },
  primary: { minHeight: 48, flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.green, borderRadius: theme.radius.sm },
  primaryText: { color: '#06251A', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  section: { marginTop: theme.spacing.xl },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
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
  retryText: { color: theme.colors.text, fontWeight: '800' }
});
