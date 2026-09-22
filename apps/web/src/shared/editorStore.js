import { create } from 'zustand';

function coalesceOps(ops) {
  const latest = [];
  for (const op of ops) {
    const previous = latest.at(-1);
    if (previous && previous.type === op.type && ['adjust', 'crop'].includes(op.type)) latest[latest.length - 1] = op;
    else latest.push(op);
  }
  return latest;
}

export const useEditorStore = create((set, get) => ({
  baseVersionId: null, ops: [], status: 'clean', error: null,
  begin(versionId) { set({ baseVersionId: versionId, ops: [], status: 'clean', error: null }); },
  addOp(op) { const ops = coalesceOps([...get().ops, op]); set({ ops, status: ops.length ? 'dirty' : 'clean', error: null }); },
  clear(versionId = null) { set({ baseVersionId: versionId, ops: [], status: 'clean', error: null }); },
  markSaving() { set({ status: 'saving', error: null }); },
  markError(error) { set({ status: 'dirty', error }); }
}));
