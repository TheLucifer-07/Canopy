/**
 * @canopy/domain
 * Pure domain contracts, invariants, and lightweight entity constructors.
 *
 * Rules (Blueprint §4.3):
 *   - NO I/O of any kind
 *   - NO database driver imports
 *   - NO HTTP types
 *   - NO React / browser APIs
 *   - MAY depend on @canopy/config for shared constants
 *
 * The actual Canopy domain model (Project, Asset, Version, Action, Memory,
 * Lineage, Fork, Merge, LCA algebra) will be built in Phase 1.
 * This file establishes the package boundary and architectural invariants.
 */

import {
  CAPTURE_FIDELITY,
  ACTOR_TYPES,
  ACTION_TYPES,
  MEMORY_TYPES,
  MEMORY_STATUS
} from '@canopy/config';

// ── Architectural Invariants (Blueprint §7.4) ────────────────────────────────
export const INVARIANTS = Object.freeze({
  I_01_VERSION_IMMUTABILITY: 'Versions are immutable once written.',
  I_02_DAG_ACYCLIC: 'Version lineage graph must remain strictly acyclic (DAG).',
  I_03_CONTENT_ADDRESSED_ASSETS: 'Assets are globally content-addressed by SHA-256.',
  I_04_ONE_WRITE_PATH: 'All mutations enter through the authoritative Core write path.',
  I_05_AUTHORITATIVE_POSTGRES: 'PostgreSQL (via Supabase) is the single source of truth.',
  I_06_ORDERED_MULTI_PARENT: 'Multi-parent merge versions have ordered parents; index 0 is the primary parent.',
  I_07_ACTOR_RECORDED: 'Human and model actors are distinguished and truthfully recorded.',
  I_08_FORK_COPIES_NOTHING: 'Fork creates a new project referencing the source version — copies no assets.',
  I_09_MERGE_REPLAY_DETERMINISM: 'Merge is operation-set composition replayed onto the LCA — not pixel compositing.',
  I_10_MEMORY_NOT_LINEAGE: 'Memory records interpretation and never duplicates lineage facts.',
  I_11_AUTHZ_PER_REQUEST: 'Authorization is verified for every operation, server-side, on every request.',
  I_01: 'Versions are immutable once written.',
  I_02: 'Version lineage graph must remain strictly acyclic (DAG).',
  I_03: 'Assets are globally content-addressed by SHA-256.',
  I_04: 'All mutations enter through the authoritative Core write path.',
  I_05: 'PostgreSQL (via Supabase) is the single source of truth.',
  I_06: 'Multi-parent merge versions have ordered parents; index 0 is the primary parent.',
  I_07: 'Human and model actors are distinguished and truthfully recorded.',
  I_08: 'Fork creates a new project referencing the source version — copies no assets.',
  I_09: 'Merge is operation-set composition replayed onto the LCA — not pixel compositing.',
  I_10: 'Memory records interpretation (what it meant) and never duplicates lineage facts.',
  I_11: 'Authorization is verified for every operation, server-side, on every request.'
});

// ── Phase 1 domain status ────────────────────────────────────────────────────
export const DOMAIN_STATUS = Object.freeze({
  phase: 'Phase 1 — Core Platform',
  note: 'Pure domain validation for Project, Asset, Version, Action, Lineage, and Memory.'
});

export class DomainError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export function assertHumanActor(actor) {
  if (!actor || actor.type !== ACTOR_TYPES.HUMAN || !actor.userId) {
    throw new DomainError('ACTOR_REQUIRED', 'A human actor with userId is required.');
  }
  return Object.freeze({ type: ACTOR_TYPES.HUMAN, userId: actor.userId });
}

export function buildDeclaredDelta(actionType, params = {}) {
  if (actionType === ACTION_TYPES.IMPORT) {
    return { facets: [{ kind: 'asset_imported' }] };
  }
  if (actionType === ACTION_TYPES.COMMIT) {
    const ops = Array.isArray(params.ops) ? params.ops : [];
    return {
      facets: ops.map((op, index) => ({
        kind: op.type,
        index,
        params: op.params || {}
      }))
    };
  }
  return { facets: [{ kind: actionType, params }] };
}

export function validateParentSet({ isRoot = false, parents = [] } = {}) {
  if (isRoot) {
    if (parents.length > 0) {
      throw new DomainError('INVALID_PARENT', 'A root version cannot have parents.');
    }
    return [];
  }

  if (!Array.isArray(parents) || parents.length < 1) {
    throw new DomainError('INVALID_PARENT', 'Every non-root version must have at least one parent.');
  }

  const seen = new Set();
  return parents.map((parentId, index) => {
    if (seen.has(parentId)) {
      throw new DomainError('INVALID_PARENT', 'A version cannot list the same parent more than once.');
    }
    seen.add(parentId);
    return Object.freeze({
      parent_version_id: parentId,
      parent_index: index,
      role: index === 0 ? 'primary' : 'merge_source'
    });
  });
}

export function wouldCreateCycle({ newVersionId, parentIds, edges }) {
  const adjacency = new Map();
  for (const edge of edges || []) {
    if (!adjacency.has(edge.version_id)) adjacency.set(edge.version_id, []);
    adjacency.get(edge.version_id).push(edge.parent_version_id);
  }
  adjacency.set(newVersionId, parentIds);

  const visit = (nodeId, seen = new Set()) => {
    if (seen.has(nodeId)) return true;
    seen.add(nodeId);
    for (const parentId of adjacency.get(nodeId) || []) {
      if (visit(parentId, new Set(seen))) return true;
    }
    return false;
  };

  return visit(newVersionId);
}

export function summarizeLineage({ versions = [], edges = [] }) {
  const childCounts = new Map();
  const parentCounts = new Map();
  for (const edge of edges) {
    childCounts.set(edge.parent_version_id, (childCounts.get(edge.parent_version_id) || 0) + 1);
    parentCounts.set(edge.version_id, (parentCounts.get(edge.version_id) || 0) + 1);
  }
  const versionIds = versions.map((version) => version.id);
  const branchPoints = versionIds.filter((id) => (childCounts.get(id) || 0) > 1);
  const tips = versionIds.filter((id) => !childCounts.has(id));
  const roots = versionIds.filter((id) => !parentCounts.has(id));
  return { branch_points: branchPoints, tips, roots };
}

export function validateMemoryInput(memory) {
  if (looksLikeLineageFact(memory.statement || '')) {
    throw new DomainError('MEMORY_LINEAGE_FACT', 'Memory should capture interpretation, not restate a lineage fact.');
  }
  if (!Object.values(MEMORY_TYPES).includes(memory.type)) {
    throw new DomainError('VALIDATION_FAILED', 'Unsupported memory type.');
  }
  if (!memory.statement || memory.statement.trim().length === 0) {
    throw new DomainError('VALIDATION_FAILED', 'Memory statement is required.');
  }
  if (memory.statement.length > 500) {
    throw new DomainError('VALIDATION_FAILED', 'Memory statement is too long.');
  }
  return Object.freeze({
    ...memory,
    status: memory.status || MEMORY_STATUS.ACTIVE,
    origin: memory.origin || 'user_authored',
    source_refs: memory.source_refs || {}
  });
}

export function validateMemoryEditInput(memory) {
  if (looksLikeLineageFact(memory.statement || '')) {
    throw new DomainError('MEMORY_LINEAGE_FACT', 'Memory should capture interpretation, not restate a lineage fact.');
  }
  if (!memory.statement || memory.statement.trim().length === 0) {
    throw new DomainError('VALIDATION_FAILED', 'Memory statement is required.');
  }
  if (memory.statement.length > 500) {
    throw new DomainError('VALIDATION_FAILED', 'Memory statement is too long.');
  }
  return Object.freeze({
    statement: memory.statement,
    rationale: memory.rationale || null,
    source_refs: memory.source_refs || {}
  });
}

export function looksLikeLineageFact(statement) {
  const normalized = statement.trim().toLowerCase();
  return /^v\d+\s+(was\s+)?(created|committed|imported|forked|merged)/.test(normalized)
    || /^version\s+\d+\s+(was\s+)?(created|committed|imported|forked|merged)/.test(normalized);
}

export function findLowestCommonAncestor({ versionIds, edges }) {
  const parentMap = new Map();
  for (const edge of edges || []) {
    if (!parentMap.has(edge.version_id)) parentMap.set(edge.version_id, []);
    parentMap.get(edge.version_id).push(edge.parent_version_id);
  }

  const ancestorsFor = (startId) => {
    const distances = new Map([[startId, 0]]);
    const queue = [startId];
    while (queue.length) {
      const current = queue.shift();
      const currentDistance = distances.get(current);
      for (const parentId of parentMap.get(current) || []) {
        if (!distances.has(parentId)) {
          distances.set(parentId, currentDistance + 1);
          queue.push(parentId);
        }
      }
    }
    return distances;
  };

  const ancestorMaps = versionIds.map(ancestorsFor);
  const common = [...ancestorMaps[0].keys()].filter((id) => ancestorMaps.every((map) => map.has(id)));
  if (!common.length) return null;
  return common.sort((a, b) => {
    const scoreA = ancestorMaps.reduce((sum, map) => sum + map.get(a), 0);
    const scoreB = ancestorMaps.reduce((sum, map) => sum + map.get(b), 0);
    return scoreA - scoreB;
  })[0];
}

export function collectPathVersionIds({ fromVersionId, toVersionId, edges }) {
  const parentMap = new Map();
  for (const edge of edges || []) {
    if (!parentMap.has(edge.version_id)) parentMap.set(edge.version_id, []);
    parentMap.get(edge.version_id).push(edge.parent_version_id);
  }
  const path = [];
  let current = toVersionId;
  const seen = new Set();
  while (current && !seen.has(current)) {
    path.unshift(current);
    if (current === fromVersionId) return path;
    seen.add(current);
    current = parentMap.get(current)?.[0];
  }
  return null;
}

export function collectOperationsForPath({ pathVersionIds, versions }) {
  const byId = new Map((versions || []).map((version) => [version.id, version]));
  return (pathVersionIds || []).slice(1).flatMap((versionId) => {
    const action = Array.isArray(byId.get(versionId)?.actions) ? byId.get(versionId).actions[0] : byId.get(versionId)?.action;
    return action?.params?.ops || [];
  });
}

export function detectMergeConflicts(operationSets) {
  const conflicts = [];
  const crops = operationSets.flat().filter((op) => op.type === 'crop');
  if (new Set(crops.map((op) => op.params?.aspect)).size > 1) {
    conflicts.push({ type: 'INCOMPATIBLE_CROPS', severity: 'manual', operations: crops });
  }
  const textValues = operationSets.flat().filter((op) => op.type === 'text').map((op) => op.params?.value);
  if (new Set(textValues).size > 1) {
    conflicts.push({ type: 'TEXT_CONFLICT', severity: 'manual', operations: operationSets.flat().filter((op) => op.type === 'text') });
  }
  return conflicts;
}

export function composeMergeOperations(operationSets, resolutions = {}) {
  const conflicts = detectMergeConflicts(operationSets);
  if (conflicts.length && !Object.keys(resolutions).length) {
    throw new DomainError('MERGE_CONFLICT', 'Merge has conflicts that require manual resolution.', { conflicts });
  }
  return operationSets.flat();
}

export function buildDeclaredDiff({ fromVersionId, toVersionId, pathVersionIds, versions }) {
  const ops = collectOperationsForPath({ pathVersionIds, versions });
  return {
    id: null,
    from_version_id: fromVersionId,
    to_version_id: toVersionId,
    status: pathVersionIds ? 'declared_only' : 'unconnected',
    path: pathVersionIds ? {
      version_ids: pathVersionIds,
      length: Math.max(pathVersionIds.length - 1, 0),
      crosses_branch_point: false
    } : null,
    summary: ops.length ? ops.map((op) => op.type).join(', ') : 'No declared operation path available.',
    facets: {
      declared: ops.map((op) => ({ changed: true, description: op.type, evidence: 'declared', params: op.params || {} }))
    },
    contribution: {
      human: { version_ids: pathVersionIds || [], summary: 'Declared operation evidence only.' },
      model: { version_ids: [], summary: 'No model contribution in declared fallback.', models_used: [] }
    },
    discrepancies: [],
    confidence: {
      declared: ops.length ? 0.9 : 0.2,
      path: pathVersionIds ? 0.8 : 0,
      observed: 0,
      overall: pathVersionIds ? 0.6 : 0.2
    },
    evidence_used: pathVersionIds ? ['declared', 'path'] : ['declared']
  };
}
