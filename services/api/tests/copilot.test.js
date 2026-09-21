import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CopilotService, COPILOT_TOOLS } from '../src/intelligence/copilot.js';
import { createProviderRegistry, AI_CAPABILITIES } from '../src/providers/index.js';

const projectId = '00000000-0000-4000-8000-000000000010';
const ownerId = '00000000-0000-4000-8000-000000000001';
const v1 = '00000000-0000-4000-8000-000000000031';
const v2 = '00000000-0000-4000-8000-000000000032';

function repository() {
  const versions = [
    { id: v1, project_id: projectId, sequence: 1, actor_type: 'human', actions: [{ type: 'import' }] },
    { id: v2, project_id: projectId, sequence: 2, actor_type: 'model', actor_model: 'test-model', actions: [{ type: 'adjust' }] }
  ];
  return {
    async assertProjectOwner() { return { id: projectId }; },
    async getLineage() { return { versions, edges: [{ version_id: v2, parent_version_id: v1, parent_index: 0 }] }; },
    async searchCopilotVersions() { return [versions[1]]; },
    async searchCopilotMemories() { return [{ id: 'memory-1', project_id: projectId, type: 'decision', statement: 'Warm tones are preferred.', status: 'active' }]; },
    async listAiGenerations() { return [versions[1]]; }
  };
}

function providerRegistry() {
  return createProviderRegistry({ providers: [{
    id: 'groq',
    models: { reasoning: 'test-model' },
    capabilities: () => [AI_CAPABILITIES.COPILOT_PLANNING],
    supports: (capability) => capability === AI_CAPABILITIES.COPILOT_PLANNING,
    configuredFor: () => true,
    unavailableReason: () => null,
    async answerQuestion() {
      return { text: `Version evidence [[VERSION:${v2}]]. Unsupported claim [[VERSION:not-authorized]].`, citations: [] };
    }
  }] });
}

describe('Phase 4 Copilot', () => {
  it('plans only from the closed tool set', async () => {
    const service = new CopilotService({ repository: repository(), providerRegistry: providerRegistry() });
    const plan = await service.plan({ question: 'What changed between V1 and V2?' });
    assert.ok(plan.tools.every((tool) => COPILOT_TOOLS.includes(tool)));
    assert.deepEqual(plan.tools, ['get_path', 'get_diff']);
    assert.ok(plan.rounds <= 4);
  });

  it('keeps explicit version evidence when a question also asks about memory', async () => {
    const service = new CopilotService({ repository: repository(), providerRegistry: providerRegistry() });
    const plan = await service.plan({ question: 'What mascot preference is recorded and what did V2 add?' });
    assert.ok(plan.tools.includes('get_version'));
    assert.ok(plan.tools.includes('search_memory'));
    assert.equal(plan.arguments.get_version.version_ref, 'V2');
  });

  it('resolves V references from authorized project lineage', async () => {
    const service = new CopilotService({ repository: repository(), providerRegistry: providerRegistry() });
    assert.equal((await service.getVersion(projectId, ownerId, 'V2')).id, v2);
    await assert.rejects(() => service.getVersion(projectId, ownerId, 'V99'), (error) => error.code === 'VERSION_NOT_FOUND');
  });

  it('strips citations that are absent from retrieved context', async () => {
    const service = new CopilotService({ repository: repository(), providerRegistry: providerRegistry() });
    const result = await service.answer({ ownerId, projectId, question: 'Which AI version exists?' });
    assert.equal(result.grounded, true);
    assert.match(result.text, new RegExp(`\\[\\[VERSION:${v2}\\]\\]`));
    assert.equal(result.text.includes('not-authorized'), false);
    assert.deepEqual(result.citations, [{ kind: 'version', id: v2 }]);
  });

  it('does not expose a mutation port to Copilot', () => {
    const service = new CopilotService({ repository: repository(), providerRegistry: providerRegistry() });
    assert.equal(typeof service.repository.createVersion, 'undefined');
    assert.equal(typeof service.repository.createMemory, 'undefined');
  });

  it('finalizes grounded citations after native stream completion', async () => {
    const streamed = createProviderRegistry({ providers: [{
      id: 'groq',
      models: { reasoning: 'test-model' },
      capabilities: () => [AI_CAPABILITIES.COPILOT_PLANNING],
      supports: (capability) => capability === AI_CAPABILITIES.COPILOT_PLANNING,
      configuredFor: () => true,
      unavailableReason: () => null,
      async streamAnswerQuestion({ onToken }) {
        await onToken(`Version [[VERSION:${v2}]].`);
        await onToken(' Fabricated [[VERSION:other-project]].');
        return { text: `Version [[VERSION:${v2}]]. Fabricated [[VERSION:other-project]].`, usage: {} };
      }
    }] });
    const emitted = [];
    const service = new CopilotService({ repository: repository(), providerRegistry: streamed });
    const result = await service.streamAnswer({ ownerId, projectId, question: 'Which AI version exists?', onToken: async (token) => emitted.push(token) });
    assert.equal(result.grounded, true);
    assert.deepEqual(result.citations, [{ kind: 'version', id: v2 }]);
    assert.equal(emitted.join(' ').includes('other-project'), false);
  });

  it('classifies memory evidence as memory citations, not versions', async () => {
    const registry = createProviderRegistry({ providers: [{
      id: 'groq', models: { reasoning: 'test-model' },
      capabilities: () => [AI_CAPABILITIES.COPILOT_PLANNING],
      supports: (capability) => capability === AI_CAPABILITIES.COPILOT_PLANNING,
      configuredFor: () => true, unavailableReason: () => null,
      async answerQuestion() { return { text: 'Warm tones are preferred. [[MEMORY:memory-1]]', citations: [] }; }
    }] });
    const result = await new CopilotService({ repository: repository(), providerRegistry: registry })
      .answer({ ownerId, projectId, question: 'memory warm tones' });
    assert.deepEqual(result.citations, [{ kind: 'memory', id: 'memory-1' }]);
  });
});
