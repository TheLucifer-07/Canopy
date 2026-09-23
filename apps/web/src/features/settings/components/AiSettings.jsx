import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, Cpu, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@canopy/ui';

export function AiSettings({ settings, onUpdate, isUpdating }) {
  const ai = settings?.ai || {};

  const [copilotGroundedness, setCopilotGroundedness] = useState(ai.copilot_groundedness || 'balanced');
  const [diffDetailLevel, setDiffDetailLevel] = useState(ai.diff_detail_level || 'standard');
  const [enableSuggestions, setEnableSuggestions] = useState(ai.enable_suggestions ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings?.ai) {
      setCopilotGroundedness(settings.ai.copilot_groundedness || 'balanced');
      setDiffDetailLevel(settings.ai.diff_detail_level || 'standard');
      setEnableSuggestions(settings.ai.enable_suggestions ?? true);
    }
  }, [settings?.ai]);

  const handleSave = async (e) => {
    e.preventDefault();
    await onUpdate({
      ai: {
        copilot_groundedness: copilotGroundedness,
        diff_detail_level: diffDetailLevel,
        enable_suggestions: enableSuggestions
      }
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">AI & Copilot Settings</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Customize Copilot reasoning style, Semantic Diff detail, and review server-managed AI infrastructure.
        </p>
      </div>

      <div className="rounded-xl border border-canopy-border bg-canopy-surface/60 p-6 space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-2">
            Copilot Reasoning Style & Groundedness
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: 'strict', label: 'Strict Lineage', desc: 'Prioritize verified version DAGs and confirmed memories' },
              { id: 'balanced', label: 'Balanced (Default)', desc: 'Standard synthesis of lineage facts and creative suggestions' },
              { id: 'creative', label: 'Exploratory', desc: 'Allow broader creative brainstorming and asset direction' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCopilotGroundedness(item.id)}
                className={`flex flex-col text-left p-3.5 rounded-lg border text-xs transition ${
                  copilotGroundedness === item.id
                    ? 'border-purple-500/50 bg-purple-950/20 text-white shadow-sm'
                    : 'border-canopy-border bg-canopy-elevated/40 text-canopy-secondary hover:text-white hover:border-canopy-border/80'
                }`}
              >
                <div className="flex items-center justify-between w-full font-semibold mb-1">
                  <span>{item.label}</span>
                  {copilotGroundedness === item.id && <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
                </div>
                <span className="text-[11px] text-canopy-muted">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-canopy-border/50">
          <label className="block text-xs font-semibold uppercase tracking-wider text-canopy-muted mb-2">
            Semantic Diff Analysis Depth
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: 'concise', label: 'Concise Summary', desc: 'Brief highlights of major creative changes' },
              { id: 'standard', label: 'Standard Analysis', desc: 'Balanced structural, color, and layout breakdowns' },
              { id: 'deep', label: 'Deep Faceted', desc: 'Exhaustive breakdown across color, lighting, typography, and mood' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDiffDetailLevel(item.id)}
                className={`flex flex-col text-left p-3.5 rounded-lg border text-xs transition ${
                  diffDetailLevel === item.id
                    ? 'border-purple-500/50 bg-purple-950/20 text-white shadow-sm'
                    : 'border-canopy-border bg-canopy-elevated/40 text-canopy-secondary hover:text-white hover:border-canopy-border/80'
                }`}
              >
                <div className="flex items-center justify-between w-full font-semibold mb-1">
                  <span>{item.label}</span>
                  {diffDetailLevel === item.id && <Check className="h-3.5 w-3.5 text-purple-400" />}
                </div>
                <span className="text-[11px] text-canopy-muted">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-canopy-border/50 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">Proactive AI Suggestions</div>
            <p className="text-[11px] text-canopy-secondary mt-0.5">
              Allow Copilot to suggest relevant version lineage prompts and memories during asset inspection.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableSuggestions}
              onChange={(e) => setEnableSuggestions(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-canopy-elevated border border-canopy-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-purple-900/30 bg-purple-950/10 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Cpu className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
              Internal AI Infrastructure
            </h3>
            <p className="text-xs text-canopy-secondary leading-relaxed">
              Canopy routes creative reasoning through a unified dual-provider architecture: Google Gemini 1.5 Pro/Flash for multimodality and semantic vision, and Groq LLaMA 3.3 70B for ultra-fast low-latency analysis.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-purple-900/20 text-xs">
          <div className="rounded-lg border border-purple-900/40 bg-purple-950/30 p-3">
            <div className="font-semibold text-purple-200">Gemini 1.5 Multimodal Engine</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">Asset vision, image embedding, visual diffing</div>
          </div>
          <div className="rounded-lg border border-purple-900/40 bg-purple-950/30 p-3">
            <div className="font-semibold text-purple-200">Groq LLaMA 3.3 Reasoning</div>
            <div className="text-[11px] text-canopy-muted mt-0.5">Low-latency Copilot chats and lineage search</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-purple-300/80 pt-1">
          <ShieldCheck className="h-4 w-4 text-canopy-green shrink-0" />
          <span>Server-managed configuration. API keys and credentials are secure and never exposed to the client.</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-canopy-green">
          {savedSuccess && '✓ AI preferences saved successfully'}
        </div>
        <Button
          type="submit"
          disabled={isUpdating}
          className="bg-purple-600 hover:bg-purple-500 text-white border-purple-500"
        >
          {isUpdating ? 'Saving...' : 'Save AI Preferences'}
        </Button>
      </div>
    </form>
  );
}
