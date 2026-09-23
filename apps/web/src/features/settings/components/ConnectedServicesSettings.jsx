import React from 'react';
import { Terminal, Cpu, Database, ExternalLink, Info } from 'lucide-react';
import { Button } from '@canopy/ui';

export function ConnectedServicesSettings({ onNavigateToDevelopers }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Connected Services</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Review active protocol bridges, connected platform services, and external integrations.
        </p>
      </div>

      <div className="space-y-4">
        {/* Active MCP Service */}
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg border border-canopy-border bg-canopy-elevated text-canopy-green shrink-0">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Model Context Protocol (MCP)</h3>
                <span className="rounded-full border border-canopy-green/30 bg-canopy-green/10 px-2 py-0.5 text-[10px] font-semibold text-canopy-green">
                  Active • v0.1.0
                </span>
              </div>
              <p className="text-xs text-canopy-secondary mt-1">
                Provides secure tool and resource access to Claude Desktop, Cursor, and autonomous agent clients.
              </p>
            </div>
          </div>
          {onNavigateToDevelopers && (
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateToDevelopers}
              className="shrink-0 text-xs inline-flex items-center gap-1.5"
            >
              <span>Developer Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* AI Engine */}
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-950/20 text-purple-400 shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Dual-Provider AI Intelligence</h3>
              <span className="rounded-full border border-purple-500/30 bg-purple-950/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                Connected
              </span>
            </div>
            <p className="text-xs text-canopy-secondary mt-1">
              Google Gemini 1.5 Pro and Groq LLaMA 3.3 are actively integrated on the Fastify application layer.
            </p>
          </div>
        </div>

        {/* Database Layer */}
        <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-5 flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg border border-canopy-border bg-canopy-elevated text-emerald-400 shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">PostgreSQL + pgvector</h3>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Connected
              </span>
            </div>
            <p className="text-xs text-canopy-secondary mt-1">
              Primary relational and semantic vector storage hosted via Supabase PostgreSQL.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Empty State for External OAuth */}
      <div className="rounded-xl border border-canopy-border/60 bg-canopy-surface/30 p-6 text-center space-y-2">
        <div className="inline-flex p-2.5 rounded-full border border-canopy-border bg-canopy-elevated text-canopy-muted mb-1">
          <Info className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-white">No External OAuth Services Connected</h4>
        <p className="text-xs text-canopy-secondary max-w-md mx-auto leading-relaxed">
          Canopy currently manages AI providers and protocol servers internally. External OAuth integrations (e.g. GitHub, Figma, Google Drive) are not configured for this prototype.
        </p>
      </div>
    </div>
  );
}
