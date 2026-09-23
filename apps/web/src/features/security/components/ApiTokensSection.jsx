import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key, Plus, Trash2, Copy, Check, AlertTriangle, ShieldCheck,
  AlertCircle, X
} from 'lucide-react';
import { Button, Input, LoadingState, ErrorState, EmptyState } from '@canopy/ui';
import { formatError } from '../../../shared/api.js';
import { formatRelativeTime } from '../../workspace/services/workspaceData.js';

const AVAILABLE_SCOPES = [
  { key: 'projects:read', label: 'Read Projects', desc: 'Inspect project metadata and goals' },
  { key: 'versions:read', label: 'Read Versions', desc: 'Read version DAG, lineage edges, and commits' },
  { key: 'memory:read', label: 'Read Memories', desc: 'Access confirmed Creative Memories' },
  { key: 'memory:write', label: 'Write Memories', desc: 'Propose and confirm new Creative Memories' },
  { key: 'versions:write', label: 'Write Versions', desc: 'Upload creative assets and create version nodes' }
];

export function ApiTokensSection({ api }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tokenNameToCreate, setTokenNameToCreate] = useState('');
  const [selectedScopes, setSelectedScopes] = useState(['projects:read', 'versions:read']);
  const [createdTokenResult, setCreatedTokenResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const tokensQuery = useQuery({
    queryKey: ['security-api-tokens'],
    queryFn: async () => {
      const res = await api.listTokens();
      return res.data || res || [];
    }
  });

  const tokens = tokensQuery.data || [];

  const createMutation = useMutation({
    mutationFn: async (payload) => api.createToken(payload),
    onSuccess: (data) => {
      setCreatedTokenResult(data.data || data);
      setTokenNameToCreate('');
      queryClient.invalidateQueries({ queryKey: ['security-api-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['user-security-status'] });
    },
    onError: (err) => {
      setErrorMessage(formatError(err, 'Could not create API token.'));
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (tokenId) => api.revokeToken(tokenId),
    onSuccess: () => {
      setTokenToRevoke(null);
      queryClient.invalidateQueries({ queryKey: ['security-api-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['user-security-status'] });
    },
    onError: (err) => {
      setErrorMessage(formatError(err, 'Could not revoke API token.'));
    }
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scopeKey) => {
    setSelectedScopes((current) =>
      current.includes(scopeKey)
        ? (current.length > 1 ? current.filter((s) => s !== scopeKey) : current)
        : [...current, scopeKey]
    );
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!tokenNameToCreate.trim()) return;
    setErrorMessage('');
    createMutation.mutate({
      name: tokenNameToCreate.trim(),
      scopes: selectedScopes
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Personal Access Tokens (PAT)</h2>
          <p className="text-xs text-canopy-secondary mt-1">
            Machine credentials for authenticating MCP clients, scripts, and developer tools.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCreatedTokenResult(null);
            setErrorMessage('');
            setIsCreateOpen(true);
          }}
          className="shrink-0 text-xs inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Generate New Token</span>
        </Button>
      </div>

      {/* Generated Token Banner (Single-view display) */}
      {createdTokenResult?.token && (
        <div className="rounded-xl border border-canopy-green/40 bg-canopy-green/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-canopy-green shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-semibold text-canopy-green uppercase tracking-wider">
                Token Generated Successfully
              </h4>
              <p className="text-xs text-canopy-secondary">
                Copy your token now. For your security, this secret will <strong className="text-white">never be displayed again</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-canopy-border bg-black/60 px-3.5 py-2 font-mono text-xs text-white select-all break-all">
              {createdTokenResult.token}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCopy(createdTokenResult.token)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-canopy-green" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Token List */}
      {tokensQuery.isLoading ? (
        <LoadingState label="Loading API tokens..." className="py-12" />
      ) : tokensQuery.error ? (
        <ErrorState message={formatError(tokensQuery.error, 'Could not load API tokens.')} />
      ) : tokens.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API Tokens Created"
          description="Generate a Personal Access Token to connect MCP clients (Claude Desktop, Cursor) or external scripts to Canopy."
          action={
            <Button onClick={() => setIsCreateOpen(true)} className="text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Generate First Token
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-canopy-border bg-canopy-surface/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-canopy-border bg-canopy-surface text-canopy-muted font-medium">
                <th className="py-3 px-4">Name / Label</th>
                <th className="py-3 px-4">Identifier Prefix</th>
                <th className="py-3 px-4">Scopes</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canopy-border">
              {tokens.map((tok) => {
                const isRevoked = Boolean(tok.revoked_at);
                return (
                  <tr key={tok.id} className="hover:bg-canopy-surface/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {tok.name || 'Unnamed Token'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-canopy-secondary">
                      {tok.token_prefix ? `${tok.token_prefix}...` : 'cnp_pat_••••••••'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(tok.scopes || []).map((s) => (
                          <span key={s} className="rounded border border-canopy-border bg-canopy-elevated px-1.5 py-0.5 text-[10px] font-mono text-canopy-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-canopy-muted font-mono text-[11px]">
                      {tok.created_at ? formatRelativeTime(tok.created_at) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {isRevoked ? (
                        <span className="inline-flex items-center rounded-full border border-rose-900/40 bg-rose-950/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-canopy-green/30 bg-canopy-green/10 px-2 py-0.5 text-[10px] font-semibold text-canopy-green">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isRevoked && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setTokenToRevoke(tok)}
                          className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          <span>Revoke</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-canopy-border bg-canopy-surface p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Generate Personal Access Token</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-canopy-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Token Name / Description
                </label>
                <Input
                  value={tokenNameToCreate}
                  onChange={(e) => setTokenNameToCreate(e.target.value)}
                  placeholder="e.g. Claude Desktop MCP Client"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-1.5">
                  Select Scopes
                </label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label
                      key={scope.key}
                      onClick={() => toggleScope(scope.key)}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                        selectedScopes.includes(scope.key)
                          ? 'border-canopy-green/40 bg-canopy-green/10'
                          : 'border-canopy-border bg-canopy-elevated/40 hover:bg-canopy-elevated'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.key)}
                        onChange={() => {}}
                        className="mt-0.5 text-canopy-green rounded bg-canopy-surface border-canopy-border"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-white">{scope.label} <code className="text-[10px] text-canopy-muted">({scope.key})</code></div>
                        <div className="text-canopy-secondary text-[11px]">{scope.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-canopy-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!tokenNameToCreate.trim() || createMutation.isPending}
                  className="text-xs"
                >
                  {createMutation.isPending ? 'Generating...' : 'Generate Token'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {tokenToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-rose-900/40 bg-canopy-surface p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-800/40">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Revoke Token?</h3>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  Are you sure you want to revoke <strong className="text-white">{tokenToRevoke.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-canopy-secondary leading-relaxed">
              This token will stop working immediately. Any MCP clients or automated scripts using this token will be denied access.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-canopy-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTokenToRevoke(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => revokeMutation.mutate(tokenToRevoke.id)}
                disabled={revokeMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white border-rose-500 text-xs"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Token'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
