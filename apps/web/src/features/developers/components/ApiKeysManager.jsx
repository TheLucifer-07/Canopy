import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key, Plus, Trash2, Copy, Check, AlertTriangle, ShieldCheck,
  CheckCircle2, Clock, EyeOff, Loader2, X
} from 'lucide-react';
import { Button, Input, Badge, EmptyState, ErrorState, LoadingState, cn } from '@canopy/ui';
import { formatError } from '../../../shared/api.js';

const AVAILABLE_SCOPES = [
  { key: 'read:projects', label: 'Read Projects', desc: 'Inspect project metadata and goals' },
  { key: 'read:versions', label: 'Read Versions', desc: 'Read version DAG, lineage edges, and commits' },
  { key: 'read:assets', label: 'Read Assets', desc: 'Access asset metadata and signed image URLs' },
  { key: 'read:memories', label: 'Read Memories', desc: 'Access confirmed Creative Memories' },
  { key: 'read:diffs', label: 'Read Diffs', desc: 'Read Semantic Diff analysis and facets' },
  { key: 'write:assets', label: 'Write Assets', desc: 'Upload creative assets and create version nodes' }
];

export function ApiKeysManager({ api }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTokenResult, setNewTokenResult] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const tokensQuery = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => api.listTokens()
  });

  const tokens = tokensQuery.data?.data || tokensQuery.data || [];

  const revokeMutation = useMutation({
    mutationFn: (tokenId) => api.revokeToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-canopy-border pb-5">
        <div>
          <h3 className="text-base font-semibold text-white">Personal Access Tokens (PAT)</h3>
          <p className="mt-1 text-xs text-canopy-secondary">
            Machine tokens for authenticating Model Context Protocol (MCP) clients, IDEs, and CLI tools.
          </p>
        </div>
        <Button
          onClick={() => {
            setNewTokenResult(null);
            setIsCreateOpen(true);
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Generate New Token
        </Button>
      </div>

      {/* Tokens List */}
      {tokensQuery.isLoading ? (
        <LoadingState label="Loading API tokens..." className="py-12" />
      ) : tokensQuery.error ? (
        <ErrorState message={formatError(tokensQuery.error, 'Could not load API tokens.')} />
      ) : tokens.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API Tokens Created"
          description="Create a personal access token to connect your local MCP clients (Claude Desktop, Cursor, or scripts) to Canopy."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Generate First Token
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-canopy-border bg-canopy-surface/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-canopy-border bg-canopy-surface text-canopy-muted font-medium">
                <th className="py-3 px-4">Name / Label</th>
                <th className="py-3 px-4">Token Identifier</th>
                <th className="py-3 px-4">Scopes</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canopy-border">
              {tokens.map((token) => {
                const isRevoked = Boolean(token.revoked_at);
                return (
                  <tr key={token.id} className="hover:bg-canopy-surface/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {token.name || 'Unnamed Token'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-canopy-secondary">
                      {token.token_prefix ? `${token.token_prefix}...` : 'cnp_pat_••••••••'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(token.scopes || []).map((scope) => (
                          <span
                            key={scope}
                            className="rounded bg-canopy-bg px-1.5 py-0.5 text-[10px] font-mono text-canopy-secondary border border-canopy-border"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-canopy-secondary">
                      {new Date(token.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {isRevoked ? (
                        <Badge variant="default" className="border-rose-500/30 bg-rose-500/10 text-rose-300 text-[10px]">
                          Revoked
                        </Badge>
                      ) : (
                        <Badge variant="default" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isRevoked && (
                        <Button
                          size="sm"
                          variant="danger"
                          className="h-7 px-2.5 text-[11px]"
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to revoke "${token.name}"? External tools using this token will lose access immediately.`)) {
                              revokeMutation.mutate(token.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Revoke
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

      {/* Token Creation Modal */}
      {isCreateOpen && (
        <CreateTokenModal
          api={api}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(result) => {
            queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
            setNewTokenResult(result);
          }}
          createdToken={newTokenResult}
        />
      )}
    </div>
  );
}

function CreateTokenModal({ api, onClose, onCreated, createdToken }) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([
    'read:projects', 'read:versions', 'read:assets', 'read:memories', 'read:diffs'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function toggleScope(scope) {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const result = await api.createToken({
        name: name.trim(),
        scopes: selectedScopes
      });
      onCreated(result);
    } catch (err) {
      setError(formatError(err, 'Could not create token.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopy() {
    if (createdToken?.token) {
      navigator.clipboard?.writeText(createdToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-canopy-border bg-canopy-surface p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-canopy-border pb-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-canopy-green" />
            <h3 className="text-base font-semibold text-white">
              {createdToken ? 'Token Created Successfully' : 'Generate Personal Access Token'}
            </h3>
          </div>
          <button onClick={onClose} className="text-canopy-muted hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdToken ? (
          /* One-Time Plaintext Token View */
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Copy your token now</span>
              </div>
              <p className="leading-relaxed">
                For security reasons, this token will <strong>never be shown again</strong>. Store it safely in your environment variables or local configuration.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-canopy-muted uppercase tracking-wider">Your Personal Access Token</label>
              <div className="flex items-center gap-2 rounded border border-canopy-border bg-canopy-bg p-2.5 font-mono text-xs text-white">
                <span className="flex-1 truncate select-all">{createdToken.token}</span>
                <Button size="sm" onClick={handleCopy} className="h-7 px-2.5 shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="rounded border border-canopy-border bg-canopy-surface/60 p-3 text-xs text-canopy-secondary space-y-1">
              <div className="font-semibold text-white">Token Label: {createdToken.name}</div>
              <div>Scopes: {createdToken.scopes?.join(', ')}</div>
            </div>

            <div className="flex justify-end pt-3">
              <Button onClick={onClose} className="w-full sm:w-auto">
                I have copied my token
              </Button>
            </div>
          </div>
        ) : (
          /* Token Creation Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-canopy-muted uppercase tracking-wider">Token Name / Label</label>
              <Input
                placeholder="e.g. claude-desktop-mcp, cursor-ide, local-script"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
              <p className="text-[11px] text-canopy-muted">A descriptive name to remember where this token is used.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-canopy-muted uppercase tracking-wider">Permissions & Scopes</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_SCOPES.map((scope) => {
                  const isChecked = selectedScopes.includes(scope.key);
                  return (
                    <div
                      key={scope.key}
                      onClick={() => toggleScope(scope.key)}
                      className={cn(
                        'cursor-pointer rounded border p-2.5 transition text-xs space-y-0.5',
                        isChecked
                          ? 'border-canopy-green bg-canopy-green/10 text-white'
                          : 'border-canopy-border bg-canopy-bg/50 text-canopy-secondary hover:text-white'
                      )}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>{scope.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-canopy-border bg-canopy-surface text-canopy-green focus:ring-0"
                        />
                      </div>
                      <p className="text-[10px] text-canopy-muted">{scope.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-canopy-border pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Create Token
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
