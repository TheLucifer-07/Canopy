import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Cpu, Copy, Check, Terminal, Shield, CheckCircle2,
  ExternalLink, Sparkles, Server, Key
} from 'lucide-react';
import { Button, cn } from '@canopy/ui';

export function McpOverview({ api, onNavigateTab }) {
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('claude');

  const tokensQuery = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => api.listTokens()
  });

  const activeTokens = (tokensQuery.data?.data || tokensQuery.data || []).filter((t) => !t.revoked_at);
  const sampleToken = activeTokens[0]?.token_prefix ? `${activeTokens[0].token_prefix}...` : 'cnp_pat_YOUR_TOKEN_HERE';

  const mcpConfigClaude = {
    mcpServers: {
      canopy: {
        command: 'node',
        args: ['services/mcp/src/index.js'],
        env: {
          CANOPY_API_URL: 'http://localhost:3000/v1',
          CANOPY_MCP_TOKEN: sampleToken
        }
      }
    }
  };

  const mcpConfigCursor = {
    mcpServers: {
      canopy: {
        command: 'node',
        args: ['services/mcp/src/index.js'],
        env: {
          CANOPY_API_URL: 'http://localhost:3000/v1',
          CANOPY_MCP_TOKEN: sampleToken
        }
      }
    }
  };

  const cliCommand = `CANOPY_API_URL=http://localhost:3000/v1 CANOPY_MCP_TOKEN=${sampleToken} node services/mcp/src/index.js`;

  function handleCopy(text, format) {
    navigator.clipboard?.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  }

  const activeCodeSnippet =
    selectedFormat === 'claude'
      ? JSON.stringify(mcpConfigClaude, null, 2)
      : selectedFormat === 'cursor'
      ? JSON.stringify(mcpConfigCursor, null, 2)
      : cliCommand;

  return (
    <div className="space-y-8">
      {/* Hero Card */}
      <div className="rounded-xl border border-canopy-border bg-gradient-to-br from-canopy-surface via-canopy-surface/60 to-canopy-bg p-6 lg:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-canopy-green">
          <Cpu className="h-4 w-4" />
          Model Context Protocol (MCP)
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Connect your AI tools directly to Canopy creative history.
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-canopy-secondary">
          The Canopy MCP Server allows AI agents in Claude Desktop, Cursor, and custom tools to explore your creative project lineage, inspect versions, compare semantic diffs, and query confirmed creative memories through secure read-only tools.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={() => onNavigateTab('tools')}>
            Browse 9 MCP Tools
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab('tokens')}>
            <Key className="h-4 w-4 mr-1.5" />
            Manage Access Tokens
          </Button>
        </div>
      </div>

      {/* Connection Quickstart */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Client Configuration</h3>
            <p className="text-xs text-canopy-secondary">Add Canopy MCP to your favorite AI agent environment.</p>
          </div>
          <div className="flex rounded-lg border border-canopy-border bg-canopy-surface p-1 text-xs">
            <button
              onClick={() => setSelectedFormat('claude')}
              className={cn(
                'rounded px-3 py-1 transition font-medium',
                selectedFormat === 'claude' ? 'bg-canopy-green/15 text-canopy-green' : 'text-canopy-secondary hover:text-white'
              )}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setSelectedFormat('cursor')}
              className={cn(
                'rounded px-3 py-1 transition font-medium',
                selectedFormat === 'cursor' ? 'bg-canopy-green/15 text-canopy-green' : 'text-canopy-secondary hover:text-white'
              )}
            >
              Cursor IDE
            </button>
            <button
              onClick={() => setSelectedFormat('cli')}
              className={cn(
                'rounded px-3 py-1 transition font-medium',
                selectedFormat === 'cli' ? 'bg-canopy-green/15 text-canopy-green' : 'text-canopy-secondary hover:text-white'
              )}
            >
              CLI / Stdio
            </button>
          </div>
        </div>

        <div className="relative rounded-lg border border-canopy-border bg-canopy-bg p-4 font-mono text-xs text-canopy-text">
          <div className="absolute right-3 top-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs bg-canopy-surface"
              onClick={() => handleCopy(activeCodeSnippet, selectedFormat)}
            >
              {copiedFormat === selectedFormat ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy Config
                </>
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto pr-24 leading-relaxed">{activeCodeSnippet}</pre>
        </div>
      </section>

      {/* Architectural Invariants & Security Principles */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-canopy-border bg-canopy-surface/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Shield className="h-4 w-4 text-canopy-green" />
            Safe Read Operations
          </div>
          <p className="text-xs text-canopy-secondary leading-relaxed">
            MCP tools provide read-only inspection. External agents cannot mutate projects, delete records, or run arbitrary shell commands.
          </p>
        </div>

        <div className="rounded-lg border border-canopy-border bg-canopy-surface/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Server className="h-4 w-4 text-emerald-400" />
            API-Mediated Authorization
          </div>
          <p className="text-xs text-canopy-secondary leading-relaxed">
            MCP connects through the authenticated Canopy API. No direct database queries or unverified requests are permitted.
          </p>
        </div>

        <div className="rounded-lg border border-canopy-border bg-canopy-surface/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Active Memory Authority
          </div>
          <p className="text-xs text-canopy-secondary leading-relaxed">
            Memory queries return only confirmed, active decisions and constraints. Unconfirmed AI proposals remain isolated.
          </p>
        </div>
      </section>
    </div>
  );
}
