import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_CAPABILITIES,
  GroqProvider,
  createProviderRegistry
} from '../src/providers/index.js';

function fakeProvider(id, capabilities, models = {}) {
  return {
    id,
    models,
    capabilities: () => capabilities,
    supports: (capability) => capabilities.includes(capability),
    configuredFor: (capability) => capabilities.includes(capability),
    unavailableReason: () => null
  };
}

describe('Phase 3 provider registry', () => {
  it('selects Gemini for observed visual diff capability', () => {
    const registry = createProviderRegistry({
      providers: [
        fakeProvider('gemini', [AI_CAPABILITIES.OBSERVED_DELTA], { vision: 'gemini-3-flash' }),
        fakeProvider('groq', [AI_CAPABILITIES.PATH_SUMMARY], { summary: 'openai/gpt-oss-20b' })
      ]
    });

    assert.equal(registry.forCapability(AI_CAPABILITIES.OBSERVED_DELTA).id, 'gemini');
  });

  it('selects Groq for path summary capability', () => {
    const registry = createProviderRegistry({
      providers: [
        fakeProvider('gemini', [AI_CAPABILITIES.OBSERVED_DELTA], { vision: 'gemini-3-flash' }),
        fakeProvider('groq', [AI_CAPABILITIES.PATH_SUMMARY], { summary: 'openai/gpt-oss-20b' })
      ]
    });

    assert.equal(registry.forCapability(AI_CAPABILITIES.PATH_SUMMARY).id, 'groq');
  });

  it('throws a typed error for unavailable capabilities', () => {
    const registry = createProviderRegistry({ providers: [] });
    assert.throws(
      () => registry.forCapability(AI_CAPABILITIES.OBSERVED_DELTA),
      (error) => error.code === 'AI_PROVIDER_UNAVAILABLE'
    );
  });

  it('forwards native Groq stream deltas without post-completion chunking', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"[[VERSION:v1]]."}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    const provider = new GroqProvider({
      fetchImpl: async () => new Response(stream, { status: 200 }),
      providerConfig: {
        groqApiKey: 'test-key',
        groqBaseUrl: 'https://api.groq.com/openai/v1',
        groqConfigured: true,
        groqReasoningConfigured: true,
        groqSummaryConfigured: true,
        groqReasoningModel: 'openai/gpt-oss-120b',
        groqSummaryModel: 'openai/gpt-oss-20b'
      }
    });
    const tokens = [];
    const result = await provider.streamAnswerQuestion({ question: 'hello', context: '[VERSION:v1]', onToken: async (token) => tokens.push(token) });
    assert.deepEqual(tokens, ['Hello ', '[[VERSION:v1]].']);
    assert.equal(result.text, 'Hello [[VERSION:v1]].');
  });
});
