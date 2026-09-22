import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkspaceModel, versionTitle } from '../../apps/web/src/features/workspace/services/workspaceData.js';

describe('Phase 3 workspace data model', () => {
  it('derives recent projects, versions, and activity from real project lineage data', () => {
    const projects = [
      { id: 'project-1', name: 'Neon Campaign', creative_goal: 'Creative lineage', version_sequence_counter: 5, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 'project-2', name: 'Poster Study', creative_goal: null, version_sequence_counter: 1, created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' }
    ];
    const model = buildWorkspaceModel(projects, {
      'project-1': {
        versions: [
          { id: 'v1', sequence: 1, label: 'V1 Import', is_root: true, actor_type: 'human', action_type: 'import', created_at: '2026-01-03T00:00:00.000Z' },
          { id: 'v5', sequence: 5, label: 'V5 Merge', actor_type: 'human', action_type: 'merge', created_at: '2026-01-05T00:00:00.000Z' }
        ]
      },
      'project-2': {
        versions: [{ id: 'p2v1', sequence: 1, actor_type: 'model', action_type: 'generate', created_at: '2026-01-04T00:00:00.000Z' }]
      }
    });

    assert.equal(model.projects[0].name, 'Neon Campaign');
    assert.equal(model.projects[0].versionCount, 2);
    assert.equal(versionTitle(model.projects[0].latestVersion), 'V5 Merge');
    assert.deepEqual(model.recentVersions.map((version) => version.id), ['v5', 'p2v1', 'v1']);
    assert.equal(model.activity[0].action, 'Creative directions merged');
  });
});
