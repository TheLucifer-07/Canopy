import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Icons, iconSize } from '../icons/index.jsx';

export function CreativeLineagePreview({ compact = false }) {
  const reduceMotion = useReducedMotion();
  const nodes = [
    ['V1', 'Import', 'human', 'A softly lit stage'],
    ['V2', 'Brightness +18', 'human', 'Warmth established'],
    ['V3', 'Generate', 'model', 'Model explored color'],
    ['V4', 'Text', 'human', 'Typography branch'],
    ['V5', 'Merge', 'human', 'Direction combined']
  ];
  return <div className="overflow-hidden border border-canopy-border bg-[#0B0D0C] p-4 sm:p-6">
    <div className="mb-5 flex items-center justify-between border-b border-canopy-border pb-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Neon Campaign</p><p className="mt-1 text-sm font-semibold text-white">Creative lineage</p></div>
      <span className="inline-flex items-center gap-2 text-xs text-canopy-secondary"><span className="h-2 w-2 rounded-full bg-canopy-green" />authoritative</span>
    </div>
    <div className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-5'}>
      {nodes.map(([version, action, actor, detail], index) => <motion.div key={version} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="relative border border-canopy-border bg-canopy-surface p-3">
        {index > 0 ? <span className="absolute -top-2 left-5 h-2 border-l border-canopy-muted sm:left-[-9px] sm:top-5 sm:h-0 sm:w-2 sm:border-l-0 sm:border-t" /> : null}
        <div className="flex items-center justify-between"><span className="font-mono text-xs text-white">{version}</span><span className={actor === 'model' ? 'text-canopy-ai' : 'text-canopy-human'}>{actor === 'model' ? <Icons.Sparkles className={iconSize.ui} /> : <Icons.History className={iconSize.ui} />}</span></div>
        <p className="mt-3 text-xs font-semibold text-white">{action}</p><p className="mt-1 text-[11px] leading-4 text-canopy-muted">{detail}</p>
      </motion.div>)}
    </div>
  </div>;
}

export function DiffPreview() {
  return <div className="border border-canopy-border bg-canopy-surface"><div className="flex items-center justify-between border-b border-canopy-border px-4 py-3"><span className="inline-flex items-center gap-2 text-sm font-semibold text-white"><Icons.FileDiff className="h-4 w-4 text-canopy-green" />Semantic diff</span><span className="text-xs text-canopy-muted">V2 to V5</span></div><div className="grid divide-y divide-canopy-border sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-canopy-muted">Declared changes</p><ul className="mt-4 space-y-3 text-sm text-canopy-secondary"><li>Brightness adjusted</li><li>Title placement added</li><li>Two directions merged</li></ul></div><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-canopy-muted">Observed meaning</p><p className="mt-4 text-sm leading-6 text-white">The direction shifts from cool exploration to a warmer editorial composition.</p><p className="mt-3 text-xs text-canopy-ai">Evidence: declared changes and visual delta</p></div></div></div>;
}

export function CopilotPreview() {
  return <div className="border border-canopy-border bg-[#101014] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Icons.Bot className="h-5 w-5 text-canopy-ai" />Canopy Copilot</div><div className="mt-5 border-l-2 border-canopy-ai/70 pl-4"><p className="text-sm text-white">Why did the team move away from blue?</p><p className="mt-3 text-sm leading-6 text-canopy-secondary">A confirmed Creative Memory says blue-dominant backgrounds read as corporate for this client. V5 keeps the warmer route.</p><p className="mt-3 text-xs text-canopy-ai">Cited: Creative Memory, V2, V5</p></div></div>;
}

export function DeveloperFlow() {
  const steps = [['Agent', Icons.Bot], ['MCP', Icons.Braces], ['Canopy API', Icons.Code2], ['Core', Icons.Network], ['PostgreSQL', Icons.Library]];
  return <div className="border border-canopy-border bg-canopy-surface p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy-muted">Developer path</p><div className="mt-5 grid gap-3 sm:grid-cols-5">{steps.map(([label, Icon]) => <div key={label} className="flex items-center gap-3 border border-canopy-border bg-canopy-bg p-3 sm:block"><Icon className="h-5 w-5 text-canopy-green sm:mb-3" /><span className="text-sm font-semibold text-white">{label}</span></div>)}</div><p className="mt-5 text-sm leading-6 text-canopy-secondary">Agents inspect authorized history through MCP and the REST API. Core and PostgreSQL remain authoritative.</p></div>;
}

