import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import {
  GitBranch,
  ImagePlus,
  Loader2,
  LogOut,
  Maximize2,
  Plus,
  RotateCw,
  Save,
  Scissors,
  SlidersHorizontal,
  Type,
  Upload,
  User
} from 'lucide-react';
import { create } from 'zustand';
import { CanopyApiClient } from '@canopy/api-client';
import { LIMITS } from '@canopy/config';
import { Button, Badge, cn } from '@canopy/ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const useEditorStore = create((set, get) => ({
  baseVersionId: null,
  ops: [],
  status: 'clean',
  error: null,
  begin(versionId) {
    set({ baseVersionId: versionId, ops: [], status: 'clean', error: null });
  },
  addOp(op) {
    const ops = coalesceOps([...get().ops, op]);
    set({ ops, status: ops.length ? 'dirty' : 'clean', error: null });
  },
  clear(versionId = null) {
    set({ baseVersionId: versionId, ops: [], status: 'clean', error: null });
  },
  markSaving() {
    set({ status: 'saving', error: null });
  },
  markError(error) {
    set({ status: 'dirty', error });
  }
}));

function coalesceOps(ops) {
  const latest = [];
  for (const op of ops) {
    const previous = latest.at(-1);
    if (previous && previous.type === op.type && ['adjust', 'crop'].includes(op.type)) {
      latest[latest.length - 1] = op;
    } else {
      latest.push(op);
    }
  }
  return latest;
}

function useApi(session) {
  return useMemo(() => new CanopyApiClient({
    baseUrl: API_URL,
    token: session?.access_token || null
  }), [session?.access_token]);
}

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState({ name: 'projects' });
  const [authChecked, setAuthChecked] = useState(!supabase);

  React.useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthChecked(true);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!supabase) return <MissingConfig />;
  if (!authChecked) return <FullScreenState label="Checking session" />;
  if (!session) return <AuthScreen />;

  return (
    <WorkspaceFrame
      session={session}
      view={view}
      setView={setView}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

function MissingConfig() {
  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
      <div className="max-w-md border border-border bg-surface p-5">
        <h1 className="text-lg font-semibold">Supabase public config required</h1>
        <p className="mt-2 text-sm text-muted">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env` to use the authenticated workspace.
        </p>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = mode === 'sign-up'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message);
  }

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm border border-border bg-surface p-5">
        <div className="mb-5">
          <div className="text-sm font-mono text-muted">CANOPY</div>
          <h1 className="mt-2 text-xl font-semibold">Creative workspace sign in</h1>
        </div>
        <label className="block text-xs text-muted" htmlFor="email">Email</label>
        <input id="email" className="mt-1 w-full border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="mt-4 block text-xs text-muted" htmlFor="password">Password</label>
        <input id="password" type="password" className="mt-1 w-full border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
        <Button className="mt-5 w-full bg-primary text-white hover:bg-ai" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
          {mode === 'sign-up' ? 'Create account' : 'Sign in'}
        </Button>
        <button type="button" className="mt-4 text-sm text-secondary hover:text-text" onClick={() => setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')}>
          {mode === 'sign-up' ? 'Use an existing account' : 'Create a new account'}
        </button>
      </form>
    </div>
  );
}

function WorkspaceFrame({ session, view, setView, onSignOut }) {
  const api = useApi(session);
  return view.name === 'project'
    ? <ProjectWorkspace api={api} projectId={view.projectId} openProject={(projectId) => setView({ name: 'project', projectId })} onBack={() => setView({ name: 'projects' })} onSignOut={onSignOut} />
    : <ProjectHome api={api} openProject={(projectId) => setView({ name: 'project', projectId })} onSignOut={onSignOut} />;
}

function ProjectHome({ api, openProject, onSignOut }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [creativeGoal, setCreativeGoal] = useState('');
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.listProjects()
  });
  const createProject = useMutation({
    mutationFn: () => api.createProject({ name, creative_goal: creativeGoal || undefined }),
    onSuccess(project) {
      setName('');
      setCreativeGoal('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      openProject(project.id);
    }
  });

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar title="Projects" onSignOut={onSignOut} />
      <main className="mx-auto max-w-6xl p-5">
        <section className="grid gap-4 md:grid-cols-[340px_1fr]">
          <div className="border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Create project</h2>
            <input aria-label="Project name" placeholder="Neon Campaign" className="mt-4 w-full border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea aria-label="Creative goal" placeholder="Creative goal" className="mt-3 h-24 w-full resize-none border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" value={creativeGoal} onChange={(event) => setCreativeGoal(event.target.value)} />
            {createProject.error ? <p className="mt-2 text-sm text-error">{createProject.error.message}</p> : null}
            <Button className="mt-4 w-full bg-primary text-white hover:bg-ai" disabled={!name.trim() || createProject.isPending} onClick={() => createProject.mutate()}>
              {createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Project
            </Button>
          </div>
          <div className="border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">Open project</div>
            {projects.isLoading ? <PanelState label="Loading projects" /> : null}
            {projects.error ? <PanelState label={projects.error.message} tone="error" /> : null}
            {projects.data?.data?.length === 0 ? <PanelState label="Create your first creative project." /> : null}
            <div className="divide-y divide-border">
              {projects.data?.data?.map((project) => (
                <button key={project.id} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-elevated focus:bg-elevated focus:outline-none" onClick={() => openProject(project.id)}>
                  <span>
                    <span className="block text-sm font-medium">{project.name}</span>
                    <span className="mt-1 block text-xs text-muted">{project.creative_goal || 'No goal set'}</span>
                  </span>
                  <GitBranch className="h-4 w-4 text-muted" />
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProjectWorkspace({ api, projectId, openProject, onBack, onSignOut }) {
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [compareFromId, setCompareFromId] = useState(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [memoryStatement, setMemoryStatement] = useState('');
  const editor = useEditorStore();

  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => api.getProject(projectId) });
  const lineage = useQuery({ queryKey: ['lineage', projectId], queryFn: () => api.getLineage(projectId), refetchOnWindowFocus: false });
  const versions = lineage.data?.versions || [];
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) || versions.at(-1) || null;

  React.useEffect(() => {
    if (!selectedVersionId && versions.length) {
      const tip = lineage.data?.tips?.[0];
      setSelectedVersionId(tip || versions.at(-1).id);
    }
    if (!compareFromId && versions.length) {
      setCompareFromId(versions[0].id);
    }
  }, [compareFromId, lineage.data?.tips, selectedVersionId, versions]);

  React.useEffect(() => {
    if (selectedVersion && !editor.baseVersionId && editor.status === 'clean') {
      editor.begin(selectedVersion.id);
    }
  }, [editor, selectedVersion]);

  const assetUrl = useQuery({
    queryKey: ['asset-url', selectedVersion?.asset_id],
    enabled: Boolean(selectedVersion?.asset_id),
    queryFn: () => api.getAssetUrl(selectedVersion.asset_id),
    staleTime: 8 * 60 * 1000
  });
  const memories = useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => api.listMemories(projectId),
    enabled: Boolean(projectId)
  });

  const uploadFlow = useMutation({
    mutationFn: async (file) => {
      validateClientImage(file);
      const asset = await api.uploadAsset(projectId, file);
      return api.importVersion(projectId, {
        asset_id: asset.id,
        label: 'V1',
        idempotencyKey: crypto.randomUUID()
      });
    },
    onSuccess(version) {
      queryClient.invalidateQueries({ queryKey: ['lineage', projectId] });
      setSelectedVersionId(version.id);
      editor.clear(version.id);
    }
  });

  function continueFrom(version) {
    api.continueFrom(version.id).then((workingState) => {
      editor.begin(workingState.base_version_id);
      setSelectedVersionId(version.id);
    }).catch((error) => editor.markError(error.message));
  }

  const forkMutation = useMutation({
    mutationFn: (version) => api.forkProject(projectId, {
      source_version_id: version.id,
      name: `${project.data?.name || 'Project'} fork V${version.sequence}`
    }),
    onSuccess(result) {
      editor.clear();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      openProject(result.project.id);
    },
    onError(error) {
      editor.markError(error.message);
    }
  });

  const mergeMutation = useMutation({
    mutationFn: () => api.mergeVersions(projectId, {
      source_version_ids: lineage.data?.tips?.slice(0, 2) || [],
      strategy: 'manual',
      resolutions: {},
      label: 'Manual merge'
    }, { idempotencyKey: crypto.randomUUID() }),
    onSuccess(version) {
      queryClient.invalidateQueries({ queryKey: ['lineage', projectId] });
      setSelectedVersionId(version.id);
      editor.clear(version.id);
    },
    onError(error) {
      editor.markError(error.message);
    }
  });

  const diffMutation = useMutation({
    mutationFn: () => api.createDiff({
      from_version_id: compareFromId || editor.baseVersionId || versions[0]?.id,
      to_version_id: selectedVersion.id
    }),
    onSuccess(diff) {
      setDiffResult(diff);
    },
    onError(error) {
      editor.markError(error.message);
    }
  });

  const memoryMutation = useMutation({
    mutationFn: () => api.createMemory(projectId, {
      type: 'insight',
      statement: memoryStatement,
      source_refs: selectedVersion ? { versions: [selectedVersion.id] } : {}
    }),
    onSuccess() {
      setMemoryStatement('');
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] });
    },
    onError(error) {
      editor.markError(error.message);
    }
  });

  const selectedOps = editor.status === 'dirty' || editor.status === 'saving'
    ? editor.ops
    : getVersionOps(selectedVersion);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-text">
      <TopBar
        title={project.data?.name || 'Workspace'}
        subtitle={selectedVersion ? `V${selectedVersion.sequence}` : 'No version'}
        onBack={onBack}
        onSignOut={onSignOut}
        action={
          <Button className="bg-primary text-white hover:bg-ai" disabled={!editor.ops.length || editor.status === 'saving'} onClick={() => setCommitOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            Save Version
          </Button>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px] grid-rows-[1fr_220px] gap-px bg-border max-lg:grid-cols-[220px_1fr] max-lg:grid-rows-[1fr_220px]">
        <VersionExplorer versions={versions} selectedVersionId={selectedVersion?.id} onSelect={setSelectedVersionId} />
        <main className="min-w-0 bg-bg">
          <EditorToolbar editor={editor} selectedVersion={selectedVersion} canEdit={Boolean(selectedVersion && editor.baseVersionId === selectedVersion.id)} />
          <CanvasStage
            imageUrl={assetUrl.data?.url}
            loading={assetUrl.isLoading}
            ops={selectedOps}
            empty={!versions.length}
            uploadPending={uploadFlow.isPending}
            uploadError={uploadFlow.error?.message}
            onImport={(file) => uploadFlow.mutate(file)}
          />
        </main>
        <VersionDetail
          version={selectedVersion}
          versions={versions}
          compareFromId={compareFromId}
          setCompareFromId={setCompareFromId}
          assetUrl={assetUrl.data}
          editor={editor}
          diffResult={diffResult}
          memories={memories.data?.data || []}
          memoryStatement={memoryStatement}
          setMemoryStatement={setMemoryStatement}
          mergeAvailable={(lineage.data?.tips?.length || 0) >= 2}
          onContinue={() => selectedVersion && continueFrom(selectedVersion)}
          onFork={() => selectedVersion && forkMutation.mutate(selectedVersion)}
          onMerge={() => mergeMutation.mutate()}
          onDiff={() => selectedVersion && diffMutation.mutate()}
          onCreateMemory={() => memoryMutation.mutate()}
          busy={forkMutation.isPending || mergeMutation.isPending || diffMutation.isPending || memoryMutation.isPending}
        />
        <section className="col-span-3 bg-surface max-lg:col-span-2">
          <LineageRail versions={versions} edges={lineage.data?.edges || []} selectedVersionId={selectedVersion?.id} onSelect={setSelectedVersionId} />
        </section>
      </div>
      {commitOpen ? (
        <CommitDialog
          api={api}
          projectId={projectId}
          baseVersion={versions.find((version) => version.id === editor.baseVersionId) || selectedVersion}
          ops={editor.ops}
          onClose={() => setCommitOpen(false)}
          onCommitted={(version) => {
            setCommitOpen(false);
            editor.clear(version.id);
            setSelectedVersionId(version.id);
            queryClient.invalidateQueries({ queryKey: ['lineage', projectId] });
          }}
        />
      ) : null}
    </div>
  );
}

function TopBar({ title, subtitle, action, onBack, onSignOut }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        {onBack ? <button className="text-xs text-secondary hover:text-text" onClick={onBack}>Projects</button> : null}
        <div className="font-mono text-sm font-semibold tracking-wide">CANOPY</div>
        <div className="h-5 w-px bg-border" />
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? <div className="font-mono text-xs text-muted">{subtitle}</div> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <button aria-label="Sign out" className="border border-border bg-elevated p-2 hover:border-primary focus:border-primary focus:outline-none" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function VersionExplorer({ versions, selectedVersionId, onSelect }) {
  return (
    <aside className="overflow-auto bg-surface">
      <div className="border-b border-border px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Version Explorer</div>
      {!versions.length ? <PanelState label="Import an image to begin." /> : null}
      <div className="divide-y divide-border">
        {[...versions].reverse().map((version) => {
          const action = getVersionAction(version);
          return (
            <button key={version.id} className={cn('w-full px-3 py-3 text-left hover:bg-elevated focus:bg-elevated focus:outline-none', selectedVersionId === version.id && 'bg-elevated')} onClick={() => onSelect(version.id)}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">V{version.sequence}</span>
                <Badge variant={version.actor_type === 'model' ? 'model' : 'human'}>{version.actor_type}</Badge>
              </div>
              <div className="mt-1 text-xs text-secondary">{action?.type || (version.is_root ? 'import' : 'commit')}</div>
              <div className="mt-1 text-xs text-muted">{formatTime(version.created_at)}</div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function EditorToolbar({ editor, selectedVersion, canEdit }) {
  const disabled = !selectedVersion || !canEdit || editor.status === 'saving';
  return (
    <div className="flex h-12 items-center gap-2 border-b border-border bg-surface px-3">
      <ToolButton disabled={disabled} icon={SlidersHorizontal} label="Brightness +12" onClick={() => editor.addOp({ type: 'adjust', params: { brightness: 12 } })} />
      <ToolButton disabled={disabled} icon={Scissors} label="Crop 4:5" onClick={() => editor.addOp({ type: 'crop', params: { aspect: '4:5' } })} />
      <ToolButton disabled={disabled} icon={RotateCw} label="Rotate 90" onClick={() => editor.addOp({ type: 'rotate', params: { degrees: 90 } })} />
      <ToolButton disabled={disabled} icon={Maximize2} label="Flip" onClick={() => editor.addOp({ type: 'flip', params: { axis: 'horizontal' } })} />
      <ToolButton disabled={disabled} icon={Type} label="Text" onClick={() => editor.addOp({ type: 'text', params: { value: 'SUMMER' } })} />
      <div className="ml-auto text-xs text-muted">
        {!selectedVersion ? 'No version selected' : !canEdit ? 'Select Continue From to edit this version' : editor.status === 'dirty' ? `${editor.ops.length} unsaved operation${editor.ops.length === 1 ? '' : 's'}` : 'No unsaved changes'}
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, ...props }) {
  return (
    <button title={label} className="inline-flex h-8 items-center gap-2 border border-border bg-elevated px-2 text-xs hover:border-primary focus:border-primary focus:outline-none disabled:opacity-40" {...props}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function CanvasStage({ imageUrl, loading, ops, empty, uploadPending, uploadError, onImport }) {
  const inputRef = React.useRef(null);
  const previewStyle = getPreviewStyle(ops);
  return (
    <div className="relative flex h-[calc(100%-3rem)] min-h-0 items-center justify-center overflow-hidden bg-canvas p-8">
      {empty ? (
        <div className="border border-dashed border-border bg-surface/80 p-6 text-center">
          <ImagePlus className="mx-auto h-8 w-8 text-secondary" />
          <p className="mt-3 text-sm font-medium">Import an image to begin.</p>
          <p className="mt-1 text-xs text-muted">PNG, JPEG, or WebP up to {Math.round(LIMITS.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)}MB.</p>
          {uploadError ? <p className="mt-3 text-sm text-error">{uploadError}</p> : null}
          <Button className="mt-4 bg-primary text-white hover:bg-ai" disabled={uploadPending} onClick={() => inputRef.current?.click()}>
            {uploadPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Image
          </Button>
          <input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />
        </div>
      ) : null}
      {loading ? <FullScreenState label="Loading version asset" inline /> : null}
      {imageUrl ? (
        <motion.div layout className="relative max-h-full max-w-full border border-border bg-surface p-3 shadow-2xl shadow-black/30">
          <img src={imageUrl} alt="Selected creative version" className="max-h-[62vh] max-w-full object-contain" style={previewStyle.image} />
          {previewStyle.crop ? <div className="pointer-events-none absolute inset-8 border border-warning/80" /> : null}
          {previewStyle.text ? <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 bg-bg/80 px-3 py-1 font-mono text-lg text-text">{previewStyle.text}</div> : null}
        </motion.div>
      ) : null}
    </div>
  );
}

function VersionDetail({
  version,
  versions,
  compareFromId,
  setCompareFromId,
  assetUrl,
  editor,
  diffResult,
  memories,
  memoryStatement,
  setMemoryStatement,
  mergeAvailable,
  onContinue,
  onFork,
  onMerge,
  onDiff,
  onCreateMemory,
  busy
}) {
  const action = getVersionAction(version);
  const parents = version?.parents || [];
  return (
    <aside className="overflow-auto bg-surface max-lg:hidden">
      <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Properties</div>
      {!version ? <PanelState label="No version selected." /> : (
        <div className="space-y-4 p-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-mono text-lg">V{version.sequence}</div>
            <Badge variant={version.actor_type === 'model' ? 'model' : 'human'}>{version.actor_type}</Badge>
          </div>
          <Meta label="Version ID" value={version.id} mono />
          <Meta label="Action" value={action?.type || (version.is_root ? 'import' : 'commit')} />
          <Meta label="Created" value={formatTime(version.created_at)} />
          <Meta label="Asset" value={version.asset_id} mono />
          <Meta label="Signed URL" value={assetUrl ? `${assetUrl.expires_in}s` : 'Loading'} />
          <div>
            <div className="mb-2 text-xs text-muted">Parents</div>
            {parents.length ? parents.map((parent) => <div key={parent.parent_version_id} className="font-mono text-xs text-secondary">{parent.parent_version_id}</div>) : <div className="text-xs text-secondary">Root version</div>}
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">Operations</div>
            <OperationList ops={getVersionOps(version)} />
          </div>
          {editor.error ? <p className="border border-error/40 bg-error/10 p-2 text-xs text-error">{editor.error}</p> : null}
          <Button className="w-full border border-border bg-elevated hover:border-primary" onClick={onContinue}>
            <GitBranch className="mr-2 h-4 w-4" />
            Continue From
          </Button>
          <Button className="w-full border border-border bg-elevated hover:border-primary" onClick={onFork} disabled={busy}>
            Fork Project
          </Button>
          <Button className="w-full border border-border bg-elevated hover:border-primary" onClick={onMerge} disabled={!mergeAvailable || busy}>
            Manual Merge Tips
          </Button>
          <CompareControls
            versions={versions}
            fromId={compareFromId}
            toVersion={version}
            onChangeFrom={setCompareFromId}
            onCompare={onDiff}
            busy={busy}
          />
          {diffResult ? <SemanticDiffPanel diff={diffResult} /> : null}
          <div className="border border-border bg-bg p-3">
            <div className="text-xs font-semibold text-text">Creative Memory</div>
            <textarea
              aria-label="Creative memory"
              className="mt-2 h-16 w-full resize-none border border-border bg-elevated px-2 py-1 text-xs outline-none focus:border-primary"
              placeholder="What did we learn, decide, prefer, or reject?"
              value={memoryStatement}
              onChange={(event) => setMemoryStatement(event.target.value)}
            />
            <Button className="mt-2 w-full border border-border bg-elevated hover:border-primary" onClick={onCreateMemory} disabled={!memoryStatement.trim() || busy}>
              Add Memory
            </Button>
            <div className="mt-3 space-y-2">
              {memories.slice(0, 3).map((memory) => (
                <div key={memory.id} className="border border-border/70 p-2 text-xs text-secondary">
                  <div className="font-mono text-[10px] uppercase text-muted">{memory.status} · {memory.origin}</div>
                  {memory.statement}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function CompareControls({ versions, fromId, toVersion, onChangeFrom, onCompare, busy }) {
  return (
    <div className="border border-border bg-bg p-3">
      <div className="text-xs font-semibold text-text">Semantic Diff</div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <label>
          <span className="mb-1 block text-muted">Version A</span>
          <select className="w-full border border-border bg-elevated px-2 py-1 outline-none focus:border-primary" value={fromId || ''} onChange={(event) => onChangeFrom(event.target.value)}>
            {versions.map((candidate) => <option key={candidate.id} value={candidate.id}>V{candidate.sequence}</option>)}
          </select>
        </label>
        <span className="mt-5 text-muted">↓</span>
        <div>
          <span className="mb-1 block text-muted">Version B</span>
          <div className="border border-border bg-elevated px-2 py-1 font-mono">V{toVersion.sequence}</div>
        </div>
      </div>
      <Button className="mt-3 w-full border border-border bg-elevated hover:border-primary" onClick={onCompare} disabled={busy || !fromId || fromId === toVersion.id}>
        Compare
      </Button>
    </div>
  );
}

function SemanticDiffPanel({ diff }) {
  const facetEntries = Object.entries(diff.facets || {});
  const providerFailures = (diff.discrepancies || []).filter((item) => item.facet == null);
  const divergences = (diff.discrepancies || []).filter((item) => item.facet);
  return (
    <div className="border border-border bg-bg p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-text">Canopy explains what changed</div>
        <Badge variant={diff.status === 'complete' ? 'human' : 'model'}>{diff.status}</Badge>
      </div>
      <p className="mt-2 text-xs text-secondary">{diff.summary}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <Metric label="Declared" value={formatConfidence(diff.confidence?.declared)} />
        <Metric label="Observed" value={formatConfidence(diff.confidence?.observed)} />
        <Metric label="Overall" value={formatConfidence(diff.confidence?.overall)} />
      </div>
      <div className="mt-3 font-mono text-[11px] text-muted">{(diff.evidence_used || []).join(' + ')}</div>
      {providerFailures.length ? (
        <div className="mt-3 border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
          {providerFailures.map((failure) => failure.note).join(' ')}
        </div>
      ) : null}
      {diff.contribution?.path?.summary ? (
        <div className="mt-3 border border-border/70 p-2">
          <div className="text-[11px] font-semibold uppercase text-muted">Path summary</div>
          <div className="mt-1 text-xs text-secondary">{diff.contribution.path.summary}</div>
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {facetEntries.filter(([, facet]) => facet.changed).slice(0, 6).map(([name, facet]) => (
          <div key={name} className="border border-border/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium capitalize">{name}</span>
              <span className="font-mono text-[10px] uppercase text-muted">{facet.evidence}</span>
            </div>
            <div className="mt-1 text-xs text-secondary">
              {facet.declared?.description ? `Declared: ${facet.declared.description}. ` : ''}
              {facet.observed?.description ? `Observed: ${facet.observed.description}` : ''}
            </div>
          </div>
        ))}
      </div>
      {divergences.length ? (
        <div className="mt-3 border border-error/40 bg-error/10 p-2 text-xs text-error">
          {divergences.length} divergence{divergences.length === 1 ? '' : 's'} preserved.
        </div>
      ) : (
        <div className="mt-3 border border-success/40 bg-success/10 p-2 text-xs text-success">Declared and observed evidence agree.</div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="border border-border/70 bg-elevated px-2 py-1">
      <div className="text-muted">{label}</div>
      <div className="mt-1 font-mono text-text">{value}</div>
    </div>
  );
}

function LineageRail({ versions, edges, selectedVersionId, onSelect }) {
  const branchSlots = getBranchSlots(edges);
  const nodes = versions.map((version, index) => ({
    id: version.id,
    position: { x: index * 150 + 30, y: branchY(version, edges, branchSlots) },
    data: { label: `V${version.sequence}`, actor: version.actor_type },
    className: cn('!border !border-border !bg-elevated !px-3 !py-2 !text-text', selectedVersionId === version.id && '!border-primary')
  }));
  const flowEdges = edges.map((edge) => ({
    id: `${edge.parent_version_id}-${edge.version_id}`,
    source: edge.parent_version_id,
    target: edge.version_id,
    animated: false,
    style: { stroke: '#667085' }
  }));

  return (
    <div className="h-full">
      <div className="flex h-9 items-center border-b border-border px-3 text-xs font-semibold uppercase tracking-wide text-muted">Creative Lineage</div>
      <ReactFlow nodes={nodes} edges={flowEdges} fitView onNodeClick={(_event, node) => onSelect(node.id)} proOptions={{ hideAttribution: true }}>
        <Background color="#272D35" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function CommitDialog({ api, projectId, baseVersion, ops, onClose, onCommitted }) {
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const editor = useEditorStore();
  const commit = useMutation({
    mutationFn: () => {
      editor.markSaving();
      return api.commitVersion(projectId, {
        base_version_id: baseVersion.id,
        ops,
        label: label || undefined,
        note: note || undefined
      }, { idempotencyKey: crypto.randomUUID() });
    },
    onSuccess(version) {
      onCommitted(version);
    },
    onError(error) {
      editor.markError(error.message);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Save Version</h2>
        <p className="mt-1 text-sm text-secondary">Base version: V{baseVersion?.sequence}</p>
        <div className="mt-4 border border-border bg-bg p-3">
          <OperationList ops={ops} />
        </div>
        <input aria-label="Version label" placeholder="Version label" className="mt-4 w-full border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" value={label} onChange={(event) => setLabel(event.target.value)} />
        <textarea aria-label="Version note" placeholder="Note" className="mt-3 h-20 w-full resize-none border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" value={note} onChange={(event) => setNote(event.target.value)} />
        {commit.error ? <p className="mt-3 text-sm text-error">{commit.error.message}. Your Working State is preserved.</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={commit.isPending}>Cancel</Button>
          <Button className="bg-primary text-white hover:bg-ai" onClick={() => commit.mutate()} disabled={commit.isPending || !ops.length}>
            {commit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Version
          </Button>
        </div>
      </div>
    </div>
  );
}

function OperationList({ ops }) {
  if (!ops?.length) return <div className="text-xs text-muted">No operations recorded.</div>;
  return (
    <ul className="space-y-1">
      {ops.map((op, index) => <li key={`${op.type}-${index}`} className="text-xs text-secondary">{humanizeOp(op)}</li>)}
    </ul>
  );
}

function Meta({ label, value, mono = false }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={cn('mt-1 break-all text-xs text-secondary', mono && 'font-mono')}>{value || 'None'}</div>
    </div>
  );
}

function PanelState({ label, tone }) {
  return <div className={cn('p-4 text-sm text-muted', tone === 'error' && 'text-error')}>{label}</div>;
}

function FullScreenState({ label, inline = false }) {
  return <div className={cn('flex items-center justify-center gap-2 text-sm text-muted', inline ? 'absolute inset-0' : 'min-h-screen bg-bg text-text')}><Loader2 className="h-4 w-4 animate-spin" />{label}</div>;
}

function validateClientImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Only PNG, JPEG, and WebP images are supported.');
  if (file.size > LIMITS.MAX_UPLOAD_SIZE_BYTES) throw new Error('Image exceeds the maximum upload size.');
}

function getVersionAction(version) {
  const actions = version?.actions;
  if (Array.isArray(actions)) return actions[0];
  return version?.action || null;
}

function getVersionOps(version) {
  const action = getVersionAction(version);
  return action?.params?.ops || [];
}

function getPreviewStyle(ops) {
  let brightness = 1;
  let rotate = 0;
  let scaleX = 1;
  let crop = false;
  let text = '';
  for (const op of ops || []) {
    if (op.type === 'adjust') brightness = 1 + (Number(op.params?.brightness || 0) / 100);
    if (op.type === 'rotate') rotate += Number(op.params?.degrees || 0);
    if (op.type === 'flip') scaleX *= -1;
    if (op.type === 'crop') crop = true;
    if (op.type === 'text') text = op.params?.value || '';
  }
  return {
    image: { filter: `brightness(${brightness})`, transform: `rotate(${rotate}deg) scaleX(${scaleX})` },
    crop,
    text
  };
}

function humanizeOp(op) {
  if (op.type === 'adjust') return `Brightness ${op.params?.brightness > 0 ? '+' : ''}${op.params?.brightness}`;
  if (op.type === 'crop') return `Crop to ${op.params?.aspect}`;
  if (op.type === 'rotate') return `Rotate ${op.params?.degrees} deg`;
  if (op.type === 'flip') return `Flip ${op.params?.axis}`;
  if (op.type === 'text') return `Add text "${op.params?.value}"`;
  return op.type;
}

function formatTime(value) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatConfidence(value) {
  const number = Number(value || 0);
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`;
}

function getBranchSlots(edges) {
  const byParent = new Map();
  for (const edge of edges) {
    if (!byParent.has(edge.parent_version_id)) byParent.set(edge.parent_version_id, []);
    byParent.get(edge.parent_version_id).push(edge.version_id);
  }
  const slots = new Map();
  for (const children of byParent.values()) {
    children.forEach((versionId, index) => slots.set(versionId, index));
  }
  return slots;
}

function branchY(version, edges, branchSlots) {
  const incoming = edges.find((edge) => edge.version_id === version.id);
  if (!incoming) return 85;
  return 45 + (branchSlots.get(version.id) || 0) * 82;
}
