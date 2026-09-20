import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_CAPABILITIES,
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
        fakeProvider('grok', [AI_CAPABILITIES.PATH_SUMMARY], { summary: 'grok-4.6' })
      ]
    });

    assert.equal(registry.forCapability(AI_CAPABILITIES.OBSERVED_DELTA).id, 'gemini');
  });

  it('selects Grok for path summary capability', () => {
    const registry = createProviderRegistry({
      providers: [
        fakeProvider('gemini', [AI_CAPABILITIES.OBSERVED_DELTA], { vision: 'gemini-3-flash' }),
        fakeProvider('grok', [AI_CAPABILITIES.PATH_SUMMARY], { summary: 'grok-4.6' })
      ]
    });

    assert.equal(registry.forCapability(AI_CAPABILITIES.PATH_SUMMARY).id, 'grok');
  });

  it('throws a typed error for unavailable capabilities', () => {
    const registry = createProviderRegistry({ providers: [] });
    assert.throws(
      () => registry.forCapability(AI_CAPABILITIES.OBSERVED_DELTA),
      (error) => error.code === 'AI_PROVIDER_UNAVAILABLE'
    );
  });
});
