import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeclaredDelta,
  summarizeLineage,
  validateMemoryInput,
  validateParentSet,
  wouldCreateCycle
} from '@canopy/domain';

describe('Phase 1 domain invariants', () => {
  it('requires parents for non-root versions and orders multi-parent edges', () => {
    assert.throws(() => validateParentSet({ isRoot: false, parents: [] }), /at least one parent/);
    assert.deepEqual(validateParentSet({ isRoot: false, parents: ['v1', 'v2'] }), [
      { parent_version_id: 'v1', parent_index: 0, role: 'primary' },
      { parent_version_id: 'v2', parent_index: 1, role: 'merge_source' }
    ]);
  });

  it('detects degenerate cycles in a proposed graph', () => {
    assert.equal(wouldCreateCycle({
      newVersionId: 'v3',
      parentIds: ['v2'],
      edges: [{ version_id: 'v2', parent_version_id: 'v1' }]
    }), false);

    assert.equal(wouldCreateCycle({
      newVersionId: 'v1',
      parentIds: ['v2'],
      edges: [{ version_id: 'v2', parent_version_id: 'v1' }]
    }), true);
  });

  it('summarizes branch points and tips from real edges', () => {
    const result = summarizeLineage({
      versions: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
      edges: [
        { version_id: 'v2', parent_version_id: 'v1' },
        { version_id: 'v3', parent_version_id: 'v1' }
      ]
    });
    assert.deepEqual(result.branch_points, ['v1']);
    assert.deepEqual(result.tips, ['v2', 'v3']);
  });

  it('builds declared deltas from typed operations', () => {
    const delta = buildDeclaredDelta('commit', {
      ops: [{ type: 'adjust', params: { brightness: 12 } }]
    });
    assert.deepEqual(delta.facets[0], {
      kind: 'adjust',
      index: 0,
      params: { brightness: 12 }
    });
  });

  it('validates memory as interpretation, not lineage storage', () => {
    const memory = validateMemoryInput({
      type: 'decision',
      statement: 'Use the warmer direction for the review.',
      source_refs: { versions: ['v2'] }
    });
    assert.equal(memory.origin, 'user_authored');
    assert.equal(memory.status, 'active');
  });
});
