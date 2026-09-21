import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticDiffService } from '../src/intelligence/index.js';
import { AI_CAPABILITIES, createProviderRegistry } from '../src/providers/index.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000010';
const V1_ID = '00000000-0000-4000-8000-000000000031';
const V2_ID = '00000000-0000-4000-8000-000000000032';

function createRepository({ budget = { tokens: 0, cost: 0 } } = {}) {
  const requests = [];
  const stored = new Map();
  const versions = [
    {
      id: V1_ID,
      project_id: PROJECT_ID,
      asset_id: 'asset-1',
      sequence: 1,
      actions: [{ type: 'import', params: {}, declared_delta: { facets: [{ kind: 'asset_imported' }] } }]
    },
    {
      id: V2_ID,
      project_id: PROJECT_ID,
      asset_id: 'asset-2',
      sequence: 2,
      actions: [{
        type: 'commit',
        params: { ops: [{ type: 'adjust', params: { brightness: 12 } }] },
        declared_delta: { facets: [{ kind: 'adjust', params: { brightness: 12 } }] }
      }]
    }
  ];
  const edges = [{ version_id: V2_ID, parent_version_id: V1_ID, parent_index: 0, role: 'primary' }];

  return {
    requests,
    async getSemanticDiff({ cacheKey }) {
      return stored.get(cacheKey) || null;
    },
    async storeSemanticDiff({ diff }) {
      const row = { id: 'diff-1', ...diff };
      stored.set(diff.cache_key, row);
      return row;
    },
    async getLineage() {
      return { versions, edges };
    },
    async downloadAssetBytes({ assetId }) {
      return {
        asset: { id: assetId, mime: 'image/png' },
        bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        mime: 'image/png'
      };
    },
    async getAiUsageForToday() {
      return budget;
    },
    async logAiRequest(row) {
      requests.push(row);
      return { id: `request-${requests.length}`, ...row };
    }
  };
}

function fakeProvider({ id, capabilities, models, methods }) {
  return {
    id,
    models,
    capabilities: () => capabilities,
    supports: (capability) => capabilities.includes(capability),
    configuredFor: () => true,
    unavailableReason: () => null,
    ...methods
  };
}

function createSuccessRegistry({ observedFacets = {} } = {}) {
  return createProviderRegistry({
    providers: [
      fakeProvider({
        id: 'groq',
        capabilities: [AI_CAPABILITIES.PATH_SUMMARY],
        models: { summary: 'openai/gpt-oss-20b' },
        methods: {
          async summarizePath() {
            return {
              provider: 'groq',
              model: 'openai/gpt-oss-20b',
              summary: 'Brightness increased along the path.',
              confidence: 0.82,
              usage: { inputTokens: 12, outputTokens: 8, estimatedCost: 0.0001 },
              promptPreview: 'path summary'
            };
          }
        }
      }),
      fakeProvider({
        id: 'gemini',
        capabilities: [AI_CAPABILITIES.OBSERVED_DELTA],
        models: { vision: 'gemini-3-flash' },
        methods: {
          async compareImages() {
            return {
              provider: 'gemini',
              model: 'gemini-3-flash',
              summary: 'The rendered image is visibly brighter.',
              facets: {
                composition: { changed: false, description: '', confidence: 0.7, evidence: 'observed' },
                framing: { changed: false, description: '', confidence: 0.7, evidence: 'observed' },
                lighting: { changed: true, description: 'Brighter overall lighting.', confidence: 0.9, evidence: 'observed' },
                color: { changed: true, description: 'Highlights are warmer.', confidence: 0.8, evidence: 'observed' },
                background: { changed: Boolean(observedFacets.background), description: observedFacets.background || '', confidence: 0.77, evidence: 'observed' },
                subject: { changed: false, description: '', confidence: 0.7, evidence: 'observed' },
                objects: { changed: false, description: '', confidence: 0.7, evidence: 'observed' },
                style: { changed: false, description: '', confidence: 0.7, evidence: 'observed' },
                typography: { changed: false, description: '', confidence: 0.7, evidence: 'observed' }
              },
              usage: { inputTokens: 30, outputTokens: 20, estimatedCost: 0 },
              promptPreview: 'observed diff'
            };
          }
        }
      })
    ]
  });
}

describe('Phase 3 semantic diff intelligence', () => {
  it('combines declared, path, and observed evidence on success', async () => {
    const repository = createRepository();
    const service = new SemanticDiffService({ repository, providerRegistry: createSuccessRegistry() });
    const diff = await service.compareVersions({
      ownerId: USER_ID,
      from: { id: V1_ID, project_id: PROJECT_ID, asset_id: 'asset-1' },
      to: { id: V2_ID, project_id: PROJECT_ID, asset_id: 'asset-2' }
    });

    assert.equal(diff.status, 'complete');
    assert.deepEqual(diff.evidence_used, ['declared', 'path', 'observed']);
    assert.equal(diff.facets.lighting.evidence, 'both');
    assert.equal(repository.requests.length, 2);
    assert.ok(repository.requests.every((request) => request.promptPreview.length <= 200));
  });

  it('preserves declared versus observed discrepancies', async () => {
    const repository = createRepository();
    const service = new SemanticDiffService({
      repository,
      providerRegistry: createSuccessRegistry({ observedFacets: { background: 'Background appears lighter.' } })
    });
    const diff = await service.compareVersions({
      ownerId: USER_ID,
      from: { id: V1_ID, project_id: PROJECT_ID, asset_id: 'asset-1' },
      to: { id: V2_ID, project_id: PROJECT_ID, asset_id: 'asset-2' }
    });

    assert.ok(diff.discrepancies.some((item) => item.facet === 'background'));
    assert.equal(diff.facets.background.evidence, 'observed');
    assert.ok(diff.confidence.overall < 0.9);
  });

  it('falls back to declared/path when observed diff fails', async () => {
    const repository = createRepository();
    const registry = createSuccessRegistry();
    registry.providers[1].compareImages = async () => {
      const error = new Error('vision failed');
      error.code = 'AI_PROVIDER_FAILED';
      throw error;
    };
    const service = new SemanticDiffService({ repository, providerRegistry: registry });
    const diff = await service.compareVersions({
      ownerId: USER_ID,
      from: { id: V1_ID, project_id: PROJECT_ID, asset_id: 'asset-1' },
      to: { id: V2_ID, project_id: PROJECT_ID, asset_id: 'asset-2' }
    });

    assert.equal(diff.status, 'partial');
    assert.deepEqual(diff.evidence_used, ['declared', 'path']);
    assert.ok(diff.discrepancies.some((item) => item.evidence_sources.includes('observed')));
  });

  it('falls back to declared-only when both AI providers are unavailable', async () => {
    const repository = createRepository();
    const service = new SemanticDiffService({
      repository,
      providerRegistry: createProviderRegistry({ providers: [] })
    });
    const diff = await service.compareVersions({
      ownerId: USER_ID,
      from: { id: V1_ID, project_id: PROJECT_ID, asset_id: 'asset-1' },
      to: { id: V2_ID, project_id: PROJECT_ID, asset_id: 'asset-2' }
    });

    assert.equal(diff.status, 'declared_only');
    assert.deepEqual(diff.evidence_used, ['declared', 'path']);
  });

  it('uses schema and model IDs in the cache identity', () => {
    const repository = createRepository();
    const serviceA = new SemanticDiffService({ repository, providerRegistry: createSuccessRegistry() });
    const serviceB = new SemanticDiffService({
      repository,
      providerRegistry: createProviderRegistry({ providers: [fakeProvider({
        id: 'groq',
        capabilities: [AI_CAPABILITIES.PATH_SUMMARY],
        models: { summary: 'openai/gpt-oss-120b' },
        methods: {}
      })] })
    });

    assert.notEqual(
      serviceA.cacheKey({ fromVersionId: V1_ID, toVersionId: V2_ID }),
      serviceB.cacheKey({ fromVersionId: V1_ID, toVersionId: V2_ID })
    );
  });

  it('marks AI work unavailable when the project budget is exhausted', async () => {
    const repository = createRepository({ budget: { tokens: 1000, cost: 10 } });
    const service = new SemanticDiffService({
      repository,
      providerRegistry: createSuccessRegistry(),
      aiConfig: { dailyCostLimit: '1', dailyTokenLimit: '100' }
    });
    const diff = await service.compareVersions({
      ownerId: USER_ID,
      from: { id: V1_ID, project_id: PROJECT_ID, asset_id: 'asset-1' },
      to: { id: V2_ID, project_id: PROJECT_ID, asset_id: 'asset-2' }
    });

    assert.equal(diff.status, 'declared_only');
    assert.ok(repository.requests.some((request) => request.errorCode === 'AI_BUDGET_EXCEEDED'));
  });
});
