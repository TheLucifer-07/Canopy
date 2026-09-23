import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Bot, GitBranch, GitCommit, GitFork, List, Loader2, Maximize2, MessageCircle, Network, RefreshCw, RotateCw, Save, Scissors, Send, SlidersHorizontal, Type, Upload, Clock
} from 'lucide-react';
import {
  Badge, Button, EmptyState, ErrorState, IconButton, Input, LoadingState, Panel, PanelHeader, PropertyRow, Textarea, cn
} from '@canopy/ui';
import { CanopyLogo } from '../components/branding/CanopyLogo.jsx';
import { ProjectHome } from '../features/projects/components/ProjectHome.jsx';
import { WorkspacePage } from '../pages/workspace/WorkspacePage.jsx';
import { formatError } from '../shared/api.js';
import { useEditorStore } from '../shared/editorStore.js';
import { VersionTimeline } from '../features/versions/components/VersionTimeline.jsx';
import { LineageGraph } from '../features/versions/components/LineageGraph.jsx';
import { VersionCompareModal } from '../features/diff/index.js';
import { CitationBadge } from '../features/copilot/index.js';


export function WorkspaceFrame({ api, user, view, setView, onSignOut }) {
  if (view.name === 'project-workbench') {
    return <ProjectWorkspace api={api} projectId={view.projectId} initialVersionId={view.versionId} initialAssetId={view.assetId} setView={setView} onSignOut={onSignOut} />;
  }
  if (view.name === 'project-home') {
    return <WorkspacePage api={api} user={user} section="project" setView={setView} onSignOut={onSignOut}>
      <ProjectHome
        api={api}
        projectId={view.projectId}
        tab={view.tab}
        onNavigateProject={(tab) => setView({ name: 'project-home', projectId: view.projectId, tab })}
        onBackToProjects={() => setView({ name: 'projects' })}
        onOpenWorkbench={(params = {}) => setView({ name: 'project-workbench', projectId: view.projectId, ...params })}
      />
    </WorkspacePage>;
  }

  return <WorkspacePage api={api} user={user} section={view.name || 'dashboard'} setView={setView} onSignOut={onSignOut} />;
}

function ProjectWorkspace({ api, projectId, initialVersionId = null, initialAssetId = null, setView, onSignOut }) {
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId);
  const [compareFromId, setCompareFromId] = useState(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('list');
  const [diffResult, setDiffResult] = useState(null);
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [memoryStatement, setMemoryStatement] = useState('');
  const [forkName, setForkName] = useState('');
  const [textValue, setTextValue] = useState('');
  const [brightness, setBrightness] = useState(0);
  const editor = useEditorStore();

  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => api.getProject(projectId) });
  const lineage = useQuery({ queryKey: ['lineage', projectId], queryFn: () => api.getLineage(projectId) });
  const versions = lineage.data?.versions || [];
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ||
    (initialAssetId ? versions.find((v) => v.asset_id === initialAssetId) : null) ||
    versions.at(-1) || null;

  useEffect(() => {
    if (!selectedVersionId && versions.length) {
      if (initialAssetId) {
        const matching = versions.find((v) => v.asset_id === initialAssetId);
        if (matching) {
          setSelectedVersionId(matching.id);
          return;
        }
      }
      setSelectedVersionId(versions.at(-1).id);
    }
  }, [selectedVersionId, versions, initialAssetId]);

  useEffect(() => {
    if (selectedVersion?.id && editor.baseVersionId !== selectedVersion.id && editor.status !== 'dirty') {
      editor.begin(selectedVersion.id);
      setBrightness(0);
      setTextValue('');
    }
  }, [selectedVersion?.id]);

  const assetUrl = useQuery({
    queryKey: ['asset-url', selectedVersion?.asset_id],
    enabled: Boolean(selectedVersion?.asset_id),
    queryFn: () => api.getAssetUrl(selectedVersion.asset_id)
  });

  const uploadFlow = useMutation({
    mutationFn: async (file) => {
      const asset = await api.uploadAsset(projectId, file);
      return api.importVersion(projectId, { asset_id: asset.id, label: 'V1' });
    },
    onSuccess(version) {
      queryClient.invalidateQueries({ queryKey: ['lineage', projectId] });
      setSelectedVersionId(version.id);
      setPanelError('');
    },
    onError(error) {
      setPanelError(formatError(error, 'Could not import the image.'));
    }
  });

  const saveVersion = useMutation({
    mutationFn: () => api.commitVersion(projectId, {
      base_version_id: editor.baseVersionId || selectedVersion.id,
      ops: editor.ops,
      label: `V${(selectedVersion?.sequence || 0) + 1}`,
      note: `Committed ${editor.ops.length} working-state operation${editor.ops.length === 1 ? '' : 's'} from Web.`
    }, { idempotencyKey: crypto.randomUUID() }),
    onMutate() {
      editor.markSaving();
      setPanelError('');
    },
    onSuccess(version) {
      editor.clear(version.id);
      queryClient.invalidateQueries({ queryKey: ['lineage', projectId] });
      setSelectedVersionId(version.id);
    },
    onError(error) {
      editor.markError(formatError(error, 'Could not save this version.'));
      setPanelError(formatError(error, 'Could not save this version.'));
    }
  });

  const continueFrom = useMutation({
    mutationFn: () => api.continueFrom(selectedVersion.id),
    onSuccess() {
      editor.begin(selectedVersion.id);
      setPanelError('');
    },
    onError(error) {
      setPanelError(formatError(error, 'Could not continue from this version.'));
    }
  });

  const createMemory = useMutation({
    mutationFn: () => api.createMemory(projectId, {
      type: 'insight',
      statement: memoryStatement,
      source_refs: selectedVersion ? { versions: [selectedVersion.id] } : {}
    }),
    onSuccess() {
      setMemoryStatement('');
      setPanelError('');
    },
    onError(error) {
      setPanelError(formatError(error, 'Could not save this memory.'));
    }
  });

  const forkProject = useMutation({
    mutationFn: () => api.forkProject(projectId, {
      source_version_id: selectedVersion.id,
      name: forkName.trim(),
      creative_goal: project.data?.creative_goal || undefined
    }),
    onSuccess(fork) {
      setForkName('');
      setView({ name: 'project-home', projectId: fork.id });
    },
    onError(error) {
      setPanelError(formatError(error, 'Could not fork this project.'));
    }
  });

  const createDiff = useMutation({
    mutationFn: () => api.createDiff({ from_version_id: compareFromId, to_version_id: selectedVersion.id }),
    onSuccess(diff) {
      setDiffResult(diff);
      setPanelError('');
    },
    onError(error) {
      setPanelError(formatError(error, 'Could not compare those versions.'));
    }
  });

  async function askCopilot() {
    if (!copilotQuestion.trim() || !selectedVersion) return;
    setCopilotBusy(true);
    setCopilotAnswer({ text: '', citations: [], tools_used: [], grounded: false });
    setPanelError('');
    try {
      await api.streamCopilot(projectId, { question: copilotQuestion }, {
        onEvent(event, data) {
          if (event === 'token') {
            setCopilotAnswer((answer) => ({ ...(answer || {}), text: `${answer?.text || ''}${data.text}` }));
          }
          if (event === 'plan') {
            setCopilotAnswer((answer) => ({ ...(answer || {}), tools_used: data.tools || [] }));
          }
          if (event === 'answer') {
            setCopilotAnswer({
              text: data.text || '',
              citations: data.citations || [],
              tools_used: data.tools_used || [],
              grounded: Boolean(data.grounded)
            });
          }
          if (event === 'error') {
            setPanelError(data.message || 'Copilot could not answer.');
          }
        }
      });
      setCopilotQuestion('');
    } catch (error) {
      setPanelError(formatError(error, 'Copilot is unavailable.'));
    } finally {
      setCopilotBusy(false);
    }
  }

  const previewStyle = useMemo(() => {
    const style = {};
    const adjust = editor.ops.findLast?.((op) => op.type === 'adjust');
    const rotates = editor.ops.filter((op) => op.type === 'rotate').reduce((sum, op) => sum + op.params.degrees, 0);
    const flip = editor.ops.findLast?.((op) => op.type === 'flip');
    if (adjust?.params?.brightness != null) style.filter = `brightness(${100 + adjust.params.brightness}%)`;
    const scaleX = flip?.params?.axis === 'horizontal' ? -1 : 1;
    const scaleY = flip?.params?.axis === 'vertical' ? -1 : 1;
    style.transform = `rotate(${rotates}deg) scale(${scaleX}, ${scaleY})`;
    return style;
  }, [editor.ops]);

  const selectedAction = selectedVersion?.action_type || selectedVersion?.action?.type || 'unknown';
  const canSave = selectedVersion && editor.ops.length > 0 && editor.status !== 'saving';

  return (
    <div className="flex min-h-screen flex-col bg-canopy-bg text-canopy-text lg:h-screen lg:overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-canopy-border bg-canopy-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setView({ name: 'project-home', projectId })}><ArrowLeft className="mr-1.5 h-4 w-4" />Project</Button>
          <CanopyLogo symbolClass="h-5 w-5" wordmarkClass="text-sm text-white" />
          <span className="text-xs text-canopy-muted">/</span>
          <span className="truncate text-sm font-semibold text-white">{project.data?.name || 'Workspace'}</span>
        </div>
        <Button variant="primary" size="sm" className="sm:self-center" disabled={!canSave} onClick={() => saveVersion.mutate()}>
          {editor.status === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Version
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-visible lg:grid-cols-[240px_minmax(0,1fr)_360px] lg:divide-x lg:divide-canopy-border lg:overflow-hidden">
        {/* Version Explorer */}
        <div className="flex min-h-[260px] flex-col overflow-hidden border-b border-canopy-border bg-canopy-surface lg:min-h-0 lg:border-b-0">
          {/* Sidebar mode tabs */}
          <div className="flex items-center border-b border-canopy-border px-2 py-1.5 gap-1">
            {[
              { mode: 'list', icon: List, label: 'List' },
              { mode: 'timeline', icon: Clock, label: 'Timeline' },
              { mode: 'graph', icon: Network, label: 'Graph' }
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                title={label}
                onClick={() => setSidebarMode(mode)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors',
                  sidebarMode === mode
                    ? 'bg-canopy-green/10 text-canopy-green border border-canopy-green/30'
                    : 'border-transparent text-canopy-muted hover:bg-canopy-elevated hover:text-white'
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto p-3">
            {sidebarMode === 'list' && (
              <>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Versions</div>
                <div className="space-y-1.5">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      className={cn('w-full rounded-md border p-2.5 text-left text-xs transition-colors', v.id === selectedVersion?.id ? 'border-canopy-green bg-canopy-green/10 text-white font-semibold' : 'border-canopy-border bg-canopy-elevated/40 text-canopy-secondary hover:border-canopy-muted hover:text-white')}
                      onClick={() => setSelectedVersionId(v.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span>V{v.sequence} — {v.label || v.action_type}</span>
                        <Badge variant={v.actor_type === 'human' ? 'human' : 'model'}>{v.actor_type}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {sidebarMode === 'timeline' && (
              <VersionTimeline
                versions={versions}
                edges={lineage.data?.edges || []}
                selectedVersionId={selectedVersion?.id}
                onSelectVersion={setSelectedVersionId}
              />
            )}
            {sidebarMode === 'graph' && (
              <div className="h-[400px] -mx-3 -mb-3 border-t border-canopy-border">
                <LineageGraph
                  versions={versions}
                  edges={lineage.data?.edges || []}
                  selectedVersionId={selectedVersion?.id}
                  onSelectVersion={setSelectedVersionId}
                />
              </div>
            )}
            {lineage.isLoading ? <LoadingState label="Loading lineage" /> : null}
            {versions.length === 0 && !lineage.isLoading ? <EmptyState title="No versions" description="Import an image to create V1." /> : null}
          </div>
        </div>

        {/* Main Canvas View */}
        <div className="relative flex min-h-[520px] flex-col items-center justify-center bg-black p-4 sm:p-6 lg:min-h-0">
          {assetUrl.isLoading ? (
            <LoadingState label="Loading creative asset" />
          ) : assetUrl.data?.url ? (
            <>
              <img
                src={assetUrl.data.url}
                alt={selectedVersion?.label || 'Creative Version'}
                style={previewStyle}
                className="max-h-[68vh] max-w-full rounded-md border border-canopy-border object-contain shadow-2xl transition-transform duration-300 lg:max-h-[72%] lg:max-w-[84%]"
              />
              {editor.ops.some((op) => op.type === 'text') ? (
                <div className="absolute bottom-24 max-w-[70%] rounded-md border border-canopy-border bg-black/85 px-3 py-2 text-center text-sm font-semibold text-white">
                  {editor.ops.findLast((op) => op.type === 'text')?.params?.value}
                </div>
              ) : null}
              <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-center gap-2 rounded-md border border-canopy-border bg-canopy-surface/95 p-2 backdrop-blur lg:absolute lg:bottom-6 lg:mt-0">
                <Button size="sm" variant="outline" onClick={() => editor.addOp({ type: 'crop', params: { aspect: '1:1' } })}><Scissors className="mr-1.5 h-4 w-4" />1:1</Button>
                <Button size="sm" variant="outline" onClick={() => editor.addOp({ type: 'rotate', params: { degrees: 90 } })}><RotateCw className="mr-1.5 h-4 w-4" />90</Button>
                <Button size="sm" variant="outline" onClick={() => editor.addOp({ type: 'flip', params: { axis: 'horizontal' } })}><Maximize2 className="mr-1.5 h-4 w-4" />Flip</Button>
                <div className="flex items-center gap-2 px-2 text-xs text-canopy-secondary">
                  <SlidersHorizontal className="h-4 w-4 text-canopy-muted" />
                  <input
                    aria-label="Brightness"
                    type="range"
                    min="-40"
                    max="40"
                    value={brightness}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setBrightness(next);
                      editor.addOp({ type: 'adjust', params: { brightness: next } });
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Upload className="h-8 w-8" />}
              title="Import Creative Asset"
              description="Upload an image to start building your creative lineage."
              action={
                <label className="cursor-pointer">
                  <span className={cn('inline-flex h-8 items-center justify-center rounded-md bg-canopy-green px-3 text-xs font-semibold text-[#06251A] transition-colors hover:bg-[#4ee0a0]', uploadFlow.isPending && 'pointer-events-none opacity-50')}>
                    {uploadFlow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Select Image
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFlow.mutate(e.target.files[0])} />
                </label>
              }
            />
          )}
        </div>

        {/* Detail Panel */}
        <div className="space-y-4 overflow-y-visible border-t border-canopy-border bg-canopy-surface p-4 lg:overflow-y-auto lg:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Version Details</div>
          {selectedVersion ? (() => {
            const versionEdges = (lineage.data?.edges || []);
            const parentIds = versionEdges.filter((e) => e.version_id === selectedVersion.id).map((e) => e.parent_version_id);
            const childIds = versionEdges.filter((e) => e.parent_version_id === selectedVersion.id).map((e) => e.version_id);
            const parentVersions = parentIds.map((pid) => versions.find((v) => v.id === pid)).filter(Boolean);
            const childVersions = childIds.map((cid) => versions.find((v) => v.id === cid)).filter(Boolean);
            const isMerge = parentIds.length > 1;
            const isBranch = childIds.length > 1;

            return (
              <div className="space-y-3 text-xs">
                <PropertyRow label="Sequence" value={`V${selectedVersion.sequence}`} />
                <PropertyRow label="Actor" value={selectedVersion.actor_type} />
                <PropertyRow label="Action" value={selectedAction} />
                {selectedVersion.created_at && (
                  <PropertyRow label="Created" value={new Date(selectedVersion.created_at).toLocaleString()} />
                )}
                {selectedVersion.note && (
                  <PropertyRow label="Note" value={selectedVersion.note} />
                )}
                <PropertyRow label="Version ID" value={selectedVersion.id} mono />

                {/* Lineage badges */}
                {(isMerge || isBranch || selectedVersion.is_root) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedVersion.is_root && <Badge variant="success">Root</Badge>}
                    {isMerge && <Badge variant="model">Merge</Badge>}
                    {isBranch && <Badge variant="warning">Branch Point</Badge>}
                  </div>
                )}

                {/* Parent versions */}
                {parentVersions.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-medium text-canopy-muted mb-1.5">Parents</div>
                    <div className="space-y-1">
                      {parentVersions.map((pv) => (
                        <button
                          key={pv.id}
                          className="w-full rounded border border-canopy-border bg-canopy-elevated/40 px-2 py-1 text-left text-canopy-secondary transition-colors hover:border-canopy-muted hover:text-white"
                          onClick={() => setSelectedVersionId(pv.id)}
                        >
                          V{pv.sequence} — {pv.label || pv.action_type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Child versions */}
                {childVersions.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-medium text-canopy-muted mb-1.5">Children</div>
                    <div className="space-y-1">
                      {childVersions.map((cv) => (
                        <button
                          key={cv.id}
                          className="w-full rounded border border-canopy-border bg-canopy-elevated/40 px-2 py-1 text-left text-canopy-secondary transition-colors hover:border-canopy-muted hover:text-white"
                          onClick={() => setSelectedVersionId(cv.id)}
                        >
                          V{cv.sequence} — {cv.label || cv.action_type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })() : null}
          {panelError ? <ErrorState message={panelError} /> : null}
          {editor.error ? <p className="text-xs text-rose-400">{editor.error}</p> : null}

          <Panel className="space-y-3 bg-canopy-elevated/40 p-3.5">
            <div className="text-xs font-semibold text-white">Working State</div>
            <div className="flex gap-2">
              <Input className="text-xs" placeholder="Text annotation" value={textValue} onChange={(event) => setTextValue(event.target.value)} />
              <IconButton label="Add text" disabled={!textValue.trim() || !selectedVersion} onClick={() => { editor.addOp({ type: 'text', params: { value: textValue.trim() } }); setTextValue(''); }}>
                <Type className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-1">
              {editor.ops.length ? editor.ops.map((op, index) => (
                <div key={`${op.type}-${index}`} className="rounded-md border border-canopy-border bg-canopy-surface px-2.5 py-1 text-[11px] text-canopy-secondary font-mono">
                  {op.type} {JSON.stringify(op.params)}
                </div>
              )) : <p className="text-xs text-canopy-muted">No uncommitted edits.</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" disabled={!selectedVersion || continueFrom.isPending} onClick={() => continueFrom.mutate()}><GitBranch className="mr-1.5 h-4 w-4" />Continue</Button>
              <Button size="sm" variant="outline" disabled={!editor.ops.length} onClick={() => editor.clear(selectedVersion?.id)}><RefreshCw className="mr-1.5 h-4 w-4" />Clear</Button>
            </div>
          </Panel>

          <Panel className="space-y-3 bg-canopy-elevated/40 p-3.5">
            <div className="text-xs font-semibold text-white">Compare</div>
            <select className="w-full rounded-md border border-canopy-border bg-canopy-elevated px-3 py-2 text-xs text-white outline-none focus:border-canopy-green" value={compareFromId || ''} onChange={(event) => setCompareFromId(event.target.value)}>
              <option value="">Choose a base version</option>
              {versions.filter((version) => version.id !== selectedVersion?.id).map((version) => <option key={version.id} value={version.id}>V{version.sequence} — {version.label || version.action_type || 'Version'}</option>)}
            </select>
            <Button
              size="sm"
              variant="primary"
              className="w-full"
              disabled={!compareFromId || !selectedVersion}
              onClick={() => setIsCompareModalOpen(true)}
            >
              <GitCommit className="mr-1.5 h-4 w-4" />
              Compare versions
            </Button>
          </Panel>

          <Panel className="space-y-3 bg-canopy-elevated/40 p-3.5">
            <div className="text-xs font-semibold text-white">Memory & Fork</div>
            <Textarea className="h-20 text-xs" placeholder="What did this version mean?" value={memoryStatement} onChange={(event) => setMemoryStatement(event.target.value)} />
            <Button size="sm" variant="outline" className="w-full" disabled={!memoryStatement.trim() || createMemory.isPending} onClick={() => createMemory.mutate()}><MessageCircle className="mr-1.5 h-4 w-4" />Save Memory</Button>
            <div className="flex gap-2">
              <Input className="text-xs" placeholder="Fork project name" value={forkName} onChange={(event) => setForkName(event.target.value)} />
              <IconButton label="Fork project" disabled={!forkName.trim() || !selectedVersion || forkProject.isPending} onClick={() => forkProject.mutate()}>
                <GitFork className="h-4 w-4" />
              </IconButton>
            </div>
          </Panel>

          <Panel className="space-y-3 border-canopy-ai/25 bg-canopy-ai/[0.05] p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-canopy-ai">
              <span className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Copilot
              </span>
              {copilotAnswer?.grounded && (
                <span className="font-mono text-[10px] text-canopy-green">Grounded</span>
              )}
            </div>
            <Textarea className="h-20 border-canopy-ai/25 text-xs focus:border-canopy-ai" placeholder="Ask about this project lineage, changes, or memory..." value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askCopilot(); } }} />
            <Button size="sm" variant="ai" className="w-full" disabled={!copilotQuestion.trim() || copilotBusy} onClick={askCopilot}>
              {copilotBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Ask Copilot
            </Button>
            {copilotAnswer?.tools_used?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {copilotAnswer.tools_used.map((tool) => (
                  <span key={tool} className="rounded bg-canopy-surface px-1.5 py-0.5 font-mono text-[9px] text-canopy-muted border border-canopy-border">
                    {tool}
                  </span>
                ))}
              </div>
            )}
            {copilotAnswer?.text ? (
              <div className="space-y-2 rounded-md border border-canopy-border bg-canopy-surface p-3">
                <p className="whitespace-pre-wrap text-xs text-canopy-text leading-relaxed">{copilotAnswer.text}</p>
                {copilotAnswer?.citations?.length > 0 && (
                  <div className="pt-2 border-t border-canopy-border/60 space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-canopy-muted">Citations:</p>
                    <div className="flex flex-wrap gap-1">
                      {copilotAnswer.citations.map((cit, i) => (
                        <CitationBadge
                          key={`${cit.kind}-${cit.id}-${i}`}
                          citation={cit}
                          versions={versions}
                          memories={[]}
                          onClick={(c) => {
                            if (c.kind === 'version') setSelectedVersionId(c.id);
                            if (c.kind === 'diff') setIsCompareModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      {isCompareModalOpen && selectedVersion && (
        <VersionCompareModal
          api={api}
          projectId={projectId}
          versions={versions}
          initialFromVersionId={compareFromId || versions.find((v) => v.id !== selectedVersion.id)?.id}
          initialToVersionId={selectedVersion.id}
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}
    </div>
  );
}
