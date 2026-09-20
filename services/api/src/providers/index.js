import { config } from '../lib/config.js';

export const AI_CAPABILITIES = Object.freeze({
  IMAGE_GENERATION: 'image_generation',
  IMAGE_EDITING: 'image_editing',
  OBSERVED_DELTA: 'observed_delta',
  PATH_SUMMARY: 'path_summary',
  COPILOT_PLANNING: 'copilot_planning',
  VERSION_SUMMARY: 'version_summary',
  MEMORY_EXTRACTION: 'memory_extraction',
  EMBEDDING: 'embedding'
});

export const OBSERVED_FACETS = Object.freeze([
  'composition',
  'framing',
  'lighting',
  'color',
  'background',
  'subject',
  'objects',
  'style',
  'typography'
]);

export const FACET_SCHEMA_VERSION = 'semantic-diff-facets-v1';

export class ProviderUnavailableError extends Error {
  constructor(capability, details = {}) {
    super(`No configured provider supports ${capability}.`);
    this.name = 'ProviderUnavailableError';
    this.code = 'AI_PROVIDER_UNAVAILABLE';
    this.capability = capability;
    this.details = details;
    this.retryable = false;
  }
}

export class ProviderConfigurationError extends Error {
  constructor(provider, capability, reason) {
    super(`${provider} is not configured for ${capability}: ${reason}`);
    this.name = 'ProviderConfigurationError';
    this.code = 'AI_PROVIDER_CONFIG_INVALID';
    this.provider = provider;
    this.capability = capability;
    this.reason = reason;
    this.retryable = false;
  }
}

export class ProviderRequestError extends Error {
  constructor(provider, code, message, { status = null, retryable = false } = {}) {
    super(message);
    this.name = 'ProviderRequestError';
    this.code = code;
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

class BaseProvider {
  constructor({ id, capabilities, models }) {
    this.id = id;
    this._capabilities = capabilities;
    this.models = models;
  }

  capabilities() {
    return Object.keys(this._capabilities);
  }

  supports(capability) {
    return Boolean(this._capabilities[capability]);
  }

  configuredFor(capability) {
    return Boolean(this._capabilities[capability]?.configured);
  }

  unavailableReason(capability) {
    return this._capabilities[capability]?.reason || null;
  }
}

export class GeminiProvider extends BaseProvider {
  constructor({ fetchImpl = fetch } = {}) {
    super({
      id: 'gemini',
      capabilities: {
        [AI_CAPABILITIES.IMAGE_GENERATION]: modelCapability(config.ai.geminiConfigured, config.ai.geminiImageConfigured, config.ai.geminiImageModel),
        [AI_CAPABILITIES.IMAGE_EDITING]: modelCapability(config.ai.geminiConfigured, config.ai.geminiImageConfigured, config.ai.geminiImageModel),
        [AI_CAPABILITIES.OBSERVED_DELTA]: modelCapability(config.ai.geminiConfigured, config.ai.geminiVisionConfigured, config.ai.geminiVisionModel),
        [AI_CAPABILITIES.EMBEDDING]: modelCapability(config.ai.geminiConfigured, config.ai.geminiEmbeddingConfigured, config.ai.geminiEmbeddingModel)
      },
      models: {
        image: config.ai.geminiImageModel,
        vision: config.ai.geminiVisionModel,
        embedding: config.ai.geminiEmbeddingModel
      }
    });
    this.apiKey = config.ai.geminiApiKey;
    this.fetch = fetchImpl;
  }

  async generateImage({ prompt }) {
    this.assertReady(AI_CAPABILITIES.IMAGE_GENERATION);
    const response = await this.callInteractions({
      model: this.models.image,
      input: [{ type: 'text', text: prompt }],
      purpose: AI_CAPABILITIES.IMAGE_GENERATION
    });
    return normalizeGeminiImageResponse(response, this.models.image);
  }

  async editImage({ prompt, image }) {
    this.assertReady(AI_CAPABILITIES.IMAGE_EDITING);
    const response = await this.callInteractions({
      model: this.models.image,
      input: [
        { type: 'text', text: prompt },
        { type: 'image', mime_type: image.mime, data: image.bytes.toString('base64') }
      ],
      purpose: AI_CAPABILITIES.IMAGE_EDITING
    });
    return normalizeGeminiImageResponse(response, this.models.image);
  }

  async compareImages({ fromImage, toImage }) {
    this.assertReady(AI_CAPABILITIES.OBSERVED_DELTA);
    const prompt = [
      'Compare two rendered creative assets and return only JSON.',
      `Use exactly these facets: ${OBSERVED_FACETS.join(', ')}.`,
      'Each facet must include changed:boolean, description:string, confidence:number from 0 to 1.',
      'Do not infer intent. Describe only visible differences.'
    ].join(' ');

    const response = await this.callGenerateContent(this.models.vision, {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: fromImage.mime, data: fromImage.bytes.toString('base64') } },
          { inline_data: { mime_type: toImage.mime, data: toImage.bytes.toString('base64') } }
        ]
      }],
      generationConfig: {
        response_mime_type: 'application/json'
      }
    }, AI_CAPABILITIES.OBSERVED_DELTA);
    const parsed = parseJsonText(extractGeminiText(response));
    return {
      provider: this.id,
      model: this.models.vision,
      facets: normalizeObservedFacets(parsed.facets || parsed),
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      usage: normalizeGeminiUsage(response.usageMetadata),
      promptPreview: promptPreview(prompt)
    };
  }

  async embed({ text }) {
    this.assertReady(AI_CAPABILITIES.EMBEDDING);
    const model = this.models.embedding;
    const response = await this.callGeminiEndpoint(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
      {
        content: { parts: [{ text }] },
        output_dimensionality: 768
      },
      AI_CAPABILITIES.EMBEDDING
    );
    const values = response.embedding?.values || response.embeddings?.[0]?.values;
    if (!Array.isArray(values)) {
      throw new ProviderRequestError(this.id, 'AI_PROVIDER_MALFORMED_RESPONSE', 'Gemini embedding response did not include values.');
    }
    return {
      provider: this.id,
      model,
      embedding: values,
      usage: normalizeGeminiUsage(response.usageMetadata),
      promptPreview: promptPreview(text)
    };
  }

  assertReady(capability) {
    if (!this.configuredFor(capability)) {
      throw new ProviderConfigurationError(this.id, capability, this.unavailableReason(capability));
    }
  }

  callInteractions(payload) {
    return this.callGeminiEndpoint('https://generativelanguage.googleapis.com/v1beta/interactions', payload, payload.purpose);
  }

  callGenerateContent(model, body, purpose) {
    return this.callGeminiEndpoint(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, body, purpose);
  }

  async callGeminiEndpoint(url, body, purpose) {
    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new ProviderRequestError(this.id, providerHttpCode(response.status, purpose), `Gemini request failed with status ${response.status}.`, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500
      });
    }
    return response.json();
  }
}

export class GrokProvider extends BaseProvider {
  constructor({ fetchImpl = fetch } = {}) {
    super({
      id: 'grok',
      capabilities: {
        [AI_CAPABILITIES.PATH_SUMMARY]: modelCapability(config.ai.xaiConfigured, config.ai.grokSummaryConfigured, config.ai.grokSummaryModel),
        [AI_CAPABILITIES.COPILOT_PLANNING]: modelCapability(config.ai.xaiConfigured, config.ai.grokReasoningConfigured, config.ai.grokReasoningModel),
        [AI_CAPABILITIES.VERSION_SUMMARY]: modelCapability(config.ai.xaiConfigured, config.ai.grokSummaryConfigured, config.ai.grokSummaryModel),
        [AI_CAPABILITIES.MEMORY_EXTRACTION]: modelCapability(config.ai.xaiConfigured, config.ai.grokReasoningConfigured, config.ai.grokReasoningModel)
      },
      models: {
        reasoning: config.ai.grokReasoningModel,
        summary: config.ai.grokSummaryModel
      }
    });
    this.apiKey = config.ai.xaiApiKey;
    this.baseUrl = config.ai.xaiBaseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
  }

  async summarizePath({ pathVersions }) {
    this.assertReady(AI_CAPABILITIES.PATH_SUMMARY);
    const prompt = [
      'Summarize this ordered Canopy version path as factual creative change evidence.',
      'Use only the supplied version IDs and declared actions. Return JSON with summary and confidence.',
      JSON.stringify(pathVersions.map((version) => ({
        id: version.id,
        sequence: version.sequence,
        action: firstAction(version)?.type || null,
        declared_delta: firstAction(version)?.declared_delta || null
      })))
    ].join('\n');
    const response = await this.callResponses({
      model: this.models.summary,
      input: prompt,
      text: { format: { type: 'json_object' } }
    }, AI_CAPABILITIES.PATH_SUMMARY);
    const parsed = parseJsonText(extractXaiText(response));
    return {
      provider: this.id,
      model: this.models.summary,
      summary: parsed.summary || '',
      confidence: clampConfidence(parsed.confidence, 0.75),
      usage: normalizeOpenAiUsage(response.usage),
      promptPreview: promptPreview(prompt)
    };
  }

  async summarizeVersion({ version }) {
    this.assertReady(AI_CAPABILITIES.VERSION_SUMMARY);
    const prompt = `Summarize this Canopy version in one sentence using only this JSON:\n${JSON.stringify(version)}`;
    const response = await this.callResponses({
      model: this.models.summary,
      input: prompt
    }, AI_CAPABILITIES.VERSION_SUMMARY);
    return {
      provider: this.id,
      model: this.models.summary,
      summary: extractXaiText(response),
      usage: normalizeOpenAiUsage(response.usage),
      promptPreview: promptPreview(prompt)
    };
  }

  assertReady(capability) {
    if (!this.configuredFor(capability)) {
      throw new ProviderConfigurationError(this.id, capability, this.unavailableReason(capability));
    }
  }

  async callResponses(body, purpose) {
    const response = await this.fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new ProviderRequestError(this.id, providerHttpCode(response.status, purpose), `xAI request failed with status ${response.status}.`, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500
      });
    }
    return response.json();
  }
}

export function createProviderRegistry({ providers = null, fetchImpl = fetch } = {}) {
  const entries = providers || [
    new GeminiProvider({ fetchImpl }),
    new GrokProvider({ fetchImpl })
  ];

  return {
    providers: entries,
    forCapability(capability) {
      const provider = entries.find((candidate) => candidate.supports(capability) && candidate.configuredFor(capability));
      if (!provider) {
        const candidates = entries
          .filter((candidate) => candidate.supports(capability))
          .map((candidate) => ({ provider: candidate.id, reason: candidate.unavailableReason(capability) }));
        throw new ProviderUnavailableError(capability, { candidates });
      }
      return provider;
    },
    describe() {
      return entries.map((provider) => ({
        id: provider.id,
        capabilities: Object.fromEntries(provider.capabilities().map((capability) => [
          capability,
          {
            configured: provider.configuredFor(capability),
            unavailable_reason: provider.unavailableReason(capability)
          }
        ])),
        models: provider.models
      }));
    },
    modelIdsForCache() {
      return entries
        .flatMap((provider) => Object.values(provider.models || {}))
        .filter(Boolean)
        .sort();
    }
  };
}

function modelCapability(hasKey, modelIsSupported, model) {
  if (!hasKey) return { configured: false, reason: 'missing_api_key' };
  if (!model) return { configured: false, reason: 'missing_model_id' };
  if (!modelIsSupported) return { configured: false, reason: `unsupported_model:${model}` };
  return { configured: true, reason: null };
}

function normalizeGeminiImageResponse(response, model) {
  const data = response.output_image?.data
    || response.outputImage?.data
    || response.interaction?.output_image?.data
    || response.interaction?.outputImage?.data;
  if (!data) {
    throw new ProviderRequestError('gemini', 'AI_PROVIDER_MALFORMED_RESPONSE', 'Gemini image response did not include output image data.');
  }
  return {
    provider: 'gemini',
    model,
    bytes: Buffer.from(data, 'base64'),
    mime: response.output_image?.mime_type || 'image/png',
    usage: normalizeGeminiUsage(response.usageMetadata),
    promptPreview: null
  };
}

function normalizeObservedFacets(rawFacets) {
  const normalized = {};
  for (const facet of OBSERVED_FACETS) {
    const value = Array.isArray(rawFacets)
      ? rawFacets.find((candidate) => candidate.facet === facet || candidate.name === facet)
      : rawFacets?.[facet];
    normalized[facet] = {
      changed: Boolean(value?.changed),
      description: typeof value?.description === 'string' ? value.description : '',
      confidence: clampConfidence(value?.confidence, value?.changed ? 0.65 : 0.5),
      evidence: 'observed'
    };
  }
  return normalized;
}

function extractGeminiText(response) {
  return response.text
    || response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')
    || '';
}

function extractXaiText(response) {
  return response.output_text
    || response.output?.flatMap((item) => item.content || []).map((content) => content.text || '').join('')
    || response.choices?.[0]?.message?.content
    || '';
}

function parseJsonText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new ProviderRequestError('ai', 'AI_PROVIDER_MALFORMED_RESPONSE', 'Provider returned an empty response.');
  const json = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new ProviderRequestError('ai', 'AI_PROVIDER_MALFORMED_RESPONSE', 'Provider response did not contain JSON.');
  return JSON.parse(json);
}

function normalizeGeminiUsage(usage = {}) {
  return {
    inputTokens: usage.promptTokenCount || usage.inputTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || usage.outputTokenCount || 0,
    estimatedCost: 0
  };
}

function normalizeOpenAiUsage(usage = {}) {
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
  return {
    inputTokens,
    outputTokens,
    estimatedCost: ((inputTokens / 1_000_000) * 2) + ((outputTokens / 1_000_000) * 6)
  };
}

function providerHttpCode(status, purpose) {
  if (status === 401 || status === 403) return 'AI_PROVIDER_AUTH_FAILED';
  if (status === 422 || status === 400) return 'AI_PROVIDER_BAD_REQUEST';
  if (status === 429) return purpose === 'budget' ? 'AI_BUDGET_EXCEEDED' : 'AI_PROVIDER_RATE_LIMITED';
  return 'AI_PROVIDER_FAILED';
}

function promptPreview(prompt) {
  return String(prompt || '').replace(/\s+/g, ' ').slice(0, 200);
}

function clampConfidence(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function firstAction(version) {
  return Array.isArray(version?.actions) ? version.actions[0] : version?.action;
}
