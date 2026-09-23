import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Sparkles, Send, Loader2, Plus, MessageSquare, CheckCircle2,
  AlertCircle, ArrowRight, HelpCircle, Layers, Brain, GitBranch,
  Split, RefreshCw, Copy, Check
} from 'lucide-react';
import { Button, Input, Textarea, Badge, EmptyState, ErrorState, LoadingState, cn } from '@canopy/ui';
import { formatError } from '../../../shared/api.js';
import { CitationBadge } from './CitationBadge.jsx';
import { VersionCompareModal } from '../../diff/index.js';

const QUICK_PROMPTS = [
  'Why did the creative direction change across versions?',
  'What active creative memories and constraints apply to this project?',
  'Summarize the evolution from the initial version to the latest.',
  'What differences exist between V1 and the latest version?'
];

export function CopilotView({ api, projectId, onOpenWorkbench, onNavigateProject }) {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const [streamError, setStreamError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareVersions, setCompareVersions] = useState({ from: null, to: null });
  const messagesEndRef = useRef(null);

  // 1. Lineage & Memories for Grounding Context
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId)
  });

  const lineageQuery = useQuery({
    queryKey: ['lineage', projectId],
    queryFn: () => api.getLineage(projectId)
  });

  const memoriesQuery = useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => api.listMemories(projectId)
  });

  // 2. Copilot Conversations List
  const conversationsQuery = useQuery({
    queryKey: ['copilot-conversations', projectId],
    queryFn: () => api.listCopilotConversations(projectId)
  });

  const versions = lineageQuery.data?.versions || [];
  const memories = memoriesQuery.data || [];
  const conversations = conversationsQuery.data?.data || conversationsQuery.data || [];

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Load conversation details when selecting an existing thread
  async function loadConversation(conversationId) {
    if (!conversationId) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }
    setActiveConversationId(conversationId);
    try {
      const conv = await api.getCopilotConversation(conversationId);
      const mapped = (conv.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: Array.isArray(m.citations) ? m.citations : [],
        tools_used: Array.isArray(m.tools_used) ? m.tools_used : [],
        grounded: Boolean(m.grounded),
        created_at: m.created_at
      }));
      setMessages(mapped);
      setStreamError('');
    } catch (err) {
      setStreamError(formatError(err, 'Could not load conversation history.'));
    }
  }

  // Handle asking Copilot
  async function handleSend(questionText) {
    const q = (questionText || inputQuestion).trim();
    if (!q || isStreaming) return;

    setInputQuestion('');
    setStreamError('');
    setIsStreaming(true);
    setActiveTools([]);

    const userMsgId = `temp-user-${Date.now()}`;
    const assistantMsgId = `temp-assistant-${Date.now()}`;

    // Optimistic UI
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: q, created_at: new Date().toISOString() },
      { id: assistantMsgId, role: 'assistant', content: '', citations: [], tools_used: [], grounded: false, streaming: true }
    ]);

    try {
      await api.streamCopilot(
        projectId,
        {
          question: q,
          ...(activeConversationId ? { conversation_id: activeConversationId } : {})
        },
        {
          onEvent: (event, data) => {
            if (event === 'plan') {
              if (data.tools) setActiveTools(data.tools);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, tools_used: data.tools || [] } : msg
                )
              );
            } else if (event === 'token') {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content: (msg.content || '') + data.text } : msg
                )
              );
            } else if (event === 'answer') {
              if (data.conversation_id && !activeConversationId) {
                setActiveConversationId(data.conversation_id);
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: data.text || msg.content,
                        citations: data.citations || [],
                        tools_used: data.tools_used || activeTools,
                        grounded: Boolean(data.grounded),
                        streaming: false
                      }
                    : msg
                )
              );
            } else if (event === 'error') {
              setStreamError(data.message || 'Copilot could not answer.');
            }
          }
        }
      );

      // Refresh conversations in background
      queryClient.invalidateQueries({ queryKey: ['copilot-conversations', projectId] });
    } catch (err) {
      setStreamError(formatError(err, 'Failed to stream Copilot answer.'));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, streaming: false } : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setActiveTools([]);
    }
  }

  function handleCitationClick(citation) {
    if (citation.kind === 'version') {
      if (onOpenWorkbench) {
        onOpenWorkbench({ versionId: citation.id });
      } else if (onNavigateProject) {
        onNavigateProject('versions');
      }
    } else if (citation.kind === 'memory') {
      if (onNavigateProject) {
        onNavigateProject('memory');
      }
    } else if (citation.kind === 'diff') {
      if (versions.length >= 2) {
        setCompareVersions({ from: versions[0].id, to: versions[versions.length - 1].id });
        setIsCompareOpen(true);
      }
    }
  }

  function handleCopy(text, id) {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mt-6 grid min-h-[680px] grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* ── Left Sidebar: Conversations & Grounding Context ── */}
      <aside className="flex flex-col justify-between border border-canopy-border bg-canopy-surface/60 p-4 backdrop-blur">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-canopy-border">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">Copilot Threads</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setActiveConversationId(null);
                setMessages([]);
                setStreamError('');
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[300px]">
            {conversations.length === 0 ? (
              <p className="py-4 text-center text-xs text-canopy-muted">No past conversations</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded text-xs transition truncate flex items-center gap-2',
                    activeConversationId === conv.id
                      ? 'bg-purple-500/15 border border-purple-500/30 text-white font-medium'
                      : 'text-canopy-secondary hover:bg-canopy-elevated hover:text-white'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{conv.title || 'Untitled conversation'}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Grounding Context Badge Info */}
        <div className="mt-6 border-t border-canopy-border pt-4 space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-canopy-muted flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-purple-400" />
            Active Grounding
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-canopy-border bg-canopy-bg p-2">
              <div className="text-[10px] text-canopy-muted">Versions</div>
              <div className="font-semibold text-emerald-400">{versions.length} records</div>
            </div>
            <div className="rounded border border-canopy-border bg-canopy-bg p-2">
              <div className="text-[10px] text-canopy-muted">Memories</div>
              <div className="font-semibold text-purple-400">{memories.length} confirmed</div>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-canopy-secondary">
            Copilot answers are strictly derived from your project lineage, declared actions, semantic diffs, and creative memory.
          </p>
        </div>
      </aside>

      {/* ── Main Chat Stream Container ── */}
      <section className="flex flex-col rounded-lg border border-canopy-border bg-canopy-surface/30 backdrop-blur">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-canopy-border px-5 py-3.5 bg-canopy-surface/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-500/20 text-purple-300">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Canopy Project Copilot</h2>
              <p className="text-[11px] text-canopy-muted">Context-aware reasoning over creative history & memory</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Grounded Model
            </span>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-[420px] max-h-[550px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Ask why your creative work changed</h3>
              <p className="mt-1 max-w-md text-xs text-canopy-secondary leading-relaxed">
                Canopy Copilot analyzes project versions, lineage graph edges, diffs, and confirmed decisions to explain the creative journey.
              </p>

              {/* Quick Prompts */}
              <div className="mt-6 grid w-full max-w-lg gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="flex items-center justify-between rounded-md border border-canopy-border bg-canopy-surface/80 px-3.5 py-2.5 text-left text-xs text-canopy-secondary transition hover:border-purple-500/40 hover:bg-purple-950/20 hover:text-white"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-purple-400 opacity-60 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 text-sm',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-purple-500/20 text-purple-300">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[85%] rounded-lg p-4 space-y-3',
                    msg.role === 'user'
                      ? 'bg-canopy-green text-[#06251A] font-medium'
                      : 'border border-canopy-border bg-canopy-surface/90 text-canopy-text'
                  )}
                >
                  {/* Assistant Tool Execution Badges */}
                  {msg.role === 'assistant' && msg.tools_used?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-canopy-border/50 text-[11px] text-canopy-muted">
                      <span className="font-mono text-[10px] text-purple-400">TOOLS:</span>
                      {msg.tools_used.map((tool) => (
                        <span
                          key={tool}
                          className="rounded bg-canopy-elevated px-1.5 py-0.5 font-mono text-[10px] text-canopy-secondary border border-canopy-border"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed text-xs">
                    {msg.content || (msg.streaming ? (
                      <span className="inline-flex items-center gap-2 text-purple-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing project lineage & evidence...
                      </span>
                    ) : null)}
                  </div>

                  {/* Interactive Citations Tray */}
                  {msg.role === 'assistant' && msg.citations?.length > 0 && (
                    <div className="pt-2 border-t border-canopy-border/60 space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-canopy-muted">
                        Cited Evidence ({msg.citations.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((citation, i) => (
                          <CitationBadge
                            key={`${citation.kind}-${citation.id}-${i}`}
                            citation={citation}
                            versions={versions}
                            memories={memories}
                            onClick={handleCitationClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grounded Status Pill & Copy button */}
                  {msg.role === 'assistant' && !msg.streaming && msg.content && (
                    <div className="flex items-center justify-between pt-2 text-[11px] text-canopy-muted">
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Grounded in project evidence
                      </span>
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="inline-flex items-center gap-1 hover:text-white transition"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Stream Error display if any */}
        {streamError && (
          <div className="mx-5 mb-3 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{streamError}</span>
          </div>
        )}

        {/* Input Bar */}
        <footer className="border-t border-canopy-border p-4 bg-canopy-surface/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              className="min-h-[44px] max-h-32 text-xs border-purple-500/20 focus:border-purple-400 bg-canopy-bg"
              placeholder="Ask Copilot about project lineage, version changes, creative decisions, or diffs... (Enter to send)"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isStreaming}
            />
            <Button
              type="submit"
              variant="ai"
              className="h-11 px-4 shrink-0"
              disabled={!inputQuestion.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </footer>
      </section>

      {/* Compare Modal if diff citation clicked */}
      {isCompareOpen && compareVersions.from && compareVersions.to && (
        <VersionCompareModal
          api={api}
          projectId={projectId}
          versions={versions}
          initialFromVersionId={compareVersions.from}
          initialToVersionId={compareVersions.to}
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
        />
      )}
    </div>
  );
}
