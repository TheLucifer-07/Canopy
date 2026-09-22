import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch, GitCommit, GitFork, Loader2, Maximize2, MessageCircle, RefreshCw, RotateCw, Save, Scissors, Send, SlidersHorizontal, Type, Upload
} from 'lucide-react';
import {
  Badge, Button, EmptyState, ErrorState, IconButton, Input, LoadingState, Panel, PanelHeader, PropertyRow, Textarea, cn
} from '@canopy/ui';
import { CanopyLogo } from '../components/branding/CanopyLogo.jsx';
import { WorkspacePage } from '../pages/workspace/WorkspacePage.jsx';
import { formatError } from '../shared/api.js';
import { useEditorStore } from '../shared/editorStore.js';

export function WorkspaceFrame({ api, user, view, setView, onSignOut }) {
  if (view.name === 'project') {
    return <ProjectWorkspace api={api} projectId={view.projectId} setView={setView} onSignOut={onSignOut} />;
  }

  return <WorkspacePage api={api} user={user} section={view.name || 'dashboard'} setView={setView} onSignOut={onSignOut} />;
}

function ProjectWorkspace({ api, projectId, setView, onSignOut }) {
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [compareFromId, setCompareFromId] = useState(null);
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
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || versions.at(-1) || null;

  useEffect(() => {
    if (!selectedVersionId && versions.length) setSelectedVersionId(versions.at(-1).id);
  }, [selectedVersionId, versions]);

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
      setView({ name: 'project', projectId: fork.id });
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
    setCopilotAnswer({ text: '', citations: [], grounded: false });
    setPanelError('');
    try {
      await api.streamCopilot(projectId, { question: copilotQuestion }, {
        onEvent(event, data) {
          if (event === 'token') {
            setCopilotAnswer((answer) => ({ ...(answer || {}), text: `${answer?.text || ''}${data.text}` }));
          }
          if (event === 'citations') {
            setCopilotAnswer((answer) => ({ ...(answer || {}), citations: data.citations || [], grounded: data.grounded }));
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
    <div className="flex h-screen flex-col bg-[#0D1117] text-[#E6EDF3] overflow-hidden">
      <header className="border-b border-[#21262D] bg-[#161B22] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setView({ name: 'dashboard' })}>← Projects</Button>
          <CanopyLogo symbolClass="h-5 w-5" wordmarkClass="text-sm" />
          <span className="text-xs text-[#8B949E]">/</span>
          <span className="text-sm font-bold text-white">{project.data?.name || 'Workspace'}</span>
        </div>
        <Button className="bg-emerald-600 text-white hover:bg-emerald-500" size="sm" disabled={!canSave} onClick={() => saveVersion.mutate()}>
          {editor.status === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Version
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-[240px_1fr_360px] divide-x divide-[#21262D] overflow-hidden">
        {/* Version Explorer */}
        <div className="p-4 space-y-3 bg-[#161B22] overflow-y-auto">
          <div className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Versions</div>
          <div className="space-y-1.5">
            {versions.map((v) => (
              <button
                key={v.id}
                className={cn('w-full p-2.5 rounded-lg text-left text-xs border transition-colors', v.id === selectedVersion?.id ? 'border-emerald-500 bg-emerald-500/10 text-white font-semibold' : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-white')}
                onClick={() => setSelectedVersionId(v.id)}
              >
                <div className="flex justify-between items-center">
                  <span>V{v.sequence} — {v.label || v.action_type}</span>
                  <Badge variant={v.actor_type === 'human' ? 'human' : 'model'}>{v.actor_type}</Badge>
                </div>
              </button>
            ))}
          </div>
          {lineage.isLoading ? <LoadingState label="Loading lineage" /> : null}
          {versions.length === 0 && !lineage.isLoading ? <EmptyState title="No versions" description="Import an image to create V1." /> : null}
        </div>

        {/* Main Canvas View */}
        <div className="flex flex-col items-center justify-center p-6 bg-[#090C10] relative">
          {assetUrl.data?.url ? (
            <>
              <img src={assetUrl.data.url} alt="Creative Version" style={previewStyle} className="max-h-[72%] max-w-[80%] rounded-lg border border-[#30363D] shadow-2xl object-contain transition-transform duration-300" />
              {editor.ops.some((op) => op.type === 'text') ? (
                <div className="absolute bottom-24 max-w-[70%] rounded bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white">
                  {editor.ops.findLast((op) => op.type === 'text')?.params?.value}
                </div>
              ) : null}
              <div className="absolute bottom-6 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-[#30363D] bg-[#161B22]/95 p-2">
                <Button size="sm" variant="outline" onClick={() => editor.addOp({ type: 'crop', params: { aspect: '1:1' } })}><Scissors className="mr-1.5 h-4 w-4" />1:1</Button>
                <Button size="sm" variant="outline" onClick={() => editor.addOp({ type: 'rotate', params: { degrees: 90 } })}><RotateCw className="mr-1.5 h-4 w-4" />90</Button>
                <Button size="sm" variant="outline" onClick={() => editor.addOp({ type: 'flip', params: { axis: 'horizontal' } })}><Maximize2 className="mr-1.5 h-4 w-4" />Flip</Button>
                <div className="flex items-center gap-2 px-2 text-xs text-[#8B949E]">
                  <SlidersHorizontal className="h-4 w-4" />
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
                  <span className={cn('inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-medium text-white transition-colors', uploadFlow.isPending && 'pointer-events-none opacity-50')}>
                    {uploadFlow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Select Image
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFlow.mutate(e.target.files[0])} />
                </label>
              }
            />
          )}
        </div>

        {/* Detail Panel */}
        <div className="p-4 bg-[#161B22] overflow-y-auto space-y-4">
          <div className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Version Details</div>
          {selectedVersion ? (
            <div className="space-y-3 text-xs">
              <PropertyRow label="Sequence" value={`V${selectedVersion.sequence}`} />
              <PropertyRow label="Actor" value={selectedVersion.actor_type} />
              <PropertyRow label="Action" value={selectedAction} />
              <PropertyRow label="Version ID" value={selectedVersion.id} mono />
            </div>
          ) : null}
          {panelError ? <ErrorState message={panelError} /> : null}
          {editor.error ? <p className="text-xs text-rose-400">{editor.error}</p> : null}

          <Panel className="space-y-3 border-[#30363D] bg-[#0D1117] p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">Working State</div>
            <div className="flex gap-2">
              <Input className="text-xs" placeholder="Text annotation" value={textValue} onChange={(event) => setTextValue(event.target.value)} />
              <IconButton label="Add text" disabled={!textValue.trim() || !selectedVersion} onClick={() => { editor.addOp({ type: 'text', params: { value: textValue.trim() } }); setTextValue(''); }}>
                <Type className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-1">
              {editor.ops.length ? editor.ops.map((op, index) => (
                <div key={`${op.type}-${index}`} className="rounded border border-[#30363D] bg-[#161B22] px-2 py-1 text-[11px] text-[#C9D1D9]">
                  {op.type} {JSON.stringify(op.params)}
                </div>
              )) : <p className="text-xs text-[#8B949E]">No uncommitted edits.</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" disabled={!selectedVersion || continueFrom.isPending} onClick={() => continueFrom.mutate()}><GitBranch className="mr-1.5 h-4 w-4" />Continue</Button>
              <Button size="sm" variant="outline" disabled={!editor.ops.length} onClick={() => editor.clear(selectedVersion?.id)}><RefreshCw className="mr-1.5 h-4 w-4" />Clear</Button>
            </div>
          </Panel>

          <Panel className="space-y-3 border-[#30363D] bg-[#0D1117] p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">Compare</div>
            <select className="w-full rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-2 text-xs text-white" value={compareFromId || ''} onChange={(event) => setCompareFromId(event.target.value)}>
              <option value="">Choose a source version</option>
              {versions.filter((version) => version.id !== selectedVersion?.id).map((version) => <option key={version.id} value={version.id}>V{version.sequence}</option>)}
            </select>
            <Button size="sm" className="w-full bg-emerald-600 text-white" disabled={!compareFromId || !selectedVersion || createDiff.isPending} onClick={() => createDiff.mutate()}><GitCommit className="mr-1.5 h-4 w-4" />Create Diff</Button>
            {diffResult ? <p className="text-xs text-[#C9D1D9]">{diffResult.summary}</p> : null}
          </Panel>

          <Panel className="space-y-3 border-[#30363D] bg-[#0D1117] p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">Memory & Fork</div>
            <Textarea className="h-20 text-xs" placeholder="What did this version mean?" value={memoryStatement} onChange={(event) => setMemoryStatement(event.target.value)} />
            <Button size="sm" variant="outline" className="w-full" disabled={!memoryStatement.trim() || createMemory.isPending} onClick={() => createMemory.mutate()}><MessageCircle className="mr-1.5 h-4 w-4" />Save Memory</Button>
            <div className="flex gap-2">
              <Input className="text-xs" placeholder="Fork project name" value={forkName} onChange={(event) => setForkName(event.target.value)} />
              <IconButton label="Fork project" disabled={!forkName.trim() || !selectedVersion || forkProject.isPending} onClick={() => forkProject.mutate()}>
                <GitFork className="h-4 w-4" />
              </IconButton>
            </div>
          </Panel>

          <Panel className="space-y-3 border-[#30363D] bg-[#0D1117] p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">Copilot</div>
            <Textarea className="h-20 text-xs" placeholder="Ask about this project lineage" value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} />
            <Button size="sm" className="w-full bg-emerald-600 text-white" disabled={!copilotQuestion.trim() || copilotBusy} onClick={askCopilot}>
              {copilotBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Ask Copilot
            </Button>
            {copilotAnswer?.text ? <p className="whitespace-pre-wrap text-xs text-[#C9D1D9]">{copilotAnswer.text}</p> : null}
            {copilotAnswer?.citations?.length ? <p className="text-[11px] text-[#8B949E]">{copilotAnswer.citations.length} citation(s), grounded: {String(copilotAnswer.grounded)}</p> : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
