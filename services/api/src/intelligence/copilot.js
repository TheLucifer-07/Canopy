import { createHash } from 'node:crypto';
import { CopilotAnswerSchema, CopilotPlanSchema } from '@canopy/schemas';
import { AI_CAPABILITIES, ProviderUnavailableError } from '../providers/index.js';
import { ApiError } from '../lib/errors.js';
import { config } from '../lib/config.js';

export const COPILOT_TOOLS = Object.freeze([
  'get_version', 'get_path', 'get_subtree', 'get_children',
  'get_lineage_overview', 'get_diff', 'search_versions',
  'search_memory', 'list_ai_generations'
]);

const MAX_PLANNER_ROUNDS = 4;
const CONTEXT_LIMIT = 12000;

export class CopilotService {
  constructor({ repository, providerRegistry, semanticDiff, aiConfig = config.ai }) {
    this.repository = repository;
    this.providerRegistry = providerRegistry;
    this.semanticDiff = semanticDiff;
    this.aiConfig = aiConfig;
  }

  async answer({ ownerId, projectId, question, conversationId = null, signal, onEvent = async () => {} }) {
    const project = await this.repository.assertProjectOwner({ projectId, ownerId });
    if (!project) throw new ApiError('PROJECT_NOT_FOUND', 'Project not found.', { statusCode: 404 });
    const plan = await this.plan({ question, projectId, ownerId, signal });
    await onEvent({ event: 'plan', data: { tools: plan.tools, rounds: plan.rounds } });
    const retrieved = await this.executePlan({ plan, projectId, ownerId, question });
    const context = assembleContext(retrieved);
    const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.COPILOT_PLANNING);
    const answer = await this.withAiRequest({
      projectId,
      purpose: 'copilot_answer',
      provider,
      model: provider.models.reasoning,
      promptPreview: 'Answer a grounded Canopy project question from tagged context.',
      run: () => provider.answerQuestion({ question, context: context.text, signal })
    });
    const validated = validateCitations(answer.text || '', answer.citations || [], context);
    const result = CopilotAnswerSchema.parse({
      text: validated.text,
      citations: validated.citations,
      tools_used: plan.tools,
      grounded: context.items.length > 0 && validated.citations.length > 0
    });
    result.context_ids = context.items.map((item) => item.id);
    result.rounds = plan.rounds;
    result.project_id = projectId;
    result.conversation_id = conversationId;
    return result;
  }

  async streamAnswer({ ownerId, projectId, question, conversationId = null, signal, onEvent = async () => {}, onToken = async () => {} }) {
    const project = await this.repository.assertProjectOwner({ projectId, ownerId });
    if (!project) throw new ApiError('PROJECT_NOT_FOUND', 'Project not found.', { statusCode: 404 });
    const plan = await this.plan({ question, projectId, ownerId, signal });
    await onEvent({ event: 'plan', data: { tools: plan.tools, rounds: plan.rounds } });
    const retrieved = await this.executePlan({ plan, projectId, ownerId, question });
    const context = assembleContext(retrieved);
    const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.COPILOT_PLANNING);
    if (!provider.streamAnswerQuestion) throw new ApiError('AI_PROVIDER_STREAM_UNAVAILABLE', 'Copilot streaming is unavailable.', { statusCode: 503 });
    let pending = '';
    const answer = await this.withAiRequest({
      projectId,
      purpose: 'copilot_answer',
      provider,
      model: provider.models.reasoning,
      promptPreview: 'Stream a grounded Canopy project answer from tagged context.',
      run: () => provider.streamAnswerQuestion({
        question,
        context: context.text,
        signal,
        onToken: async (delta) => {
          pending += delta;
          const complete = takeCompleteSentences(pending);
          pending = complete.remainder;
          for (const sentence of complete.sentences) {
            const safe = validateCitations(sentence, [], context);
            if (safe.invalidCount === 0) await onToken(safe.text);
          }
        }
      })
    });
    const final = validateCitations(answer.text || `${pending}`, answer.citations || [], context);
    if (pending && final.invalidCount === 0) await onToken(pending);
    const result = CopilotAnswerSchema.parse({
      text: final.text,
      citations: final.citations,
      tools_used: plan.tools,
      grounded: context.items.length > 0 && final.citations.length > 0
    });
    result.context_ids = context.items.map((item) => item.id);
    result.rounds = plan.rounds;
    result.project_id = projectId;
    result.conversation_id = conversationId;
    return result;
  }

  async plan({ question, projectId, signal }) {
    let plan;
    for (let round = 1; round <= MAX_PLANNER_ROUNDS; round += 1) {
      const deterministicPlan = heuristicPlan(question);
      plan = deterministicPlan;
      try {
        const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.COPILOT_PLANNING);
        if (provider.planQuestion) {
          const providerPlan = await this.withAiRequest({
            projectId,
            purpose: 'copilot_plan',
            provider,
            model: provider.models.reasoning,
            promptPreview: 'Plan a grounded Canopy history lookup.',
            run: () => provider.planQuestion({ question, signal })
          });
          plan = mergePlans(deterministicPlan, providerPlan);
        }
      } catch {
        // Deterministic planning keeps structured history questions available during AI outages.
      }
      const parsedResult = CopilotPlanSchema.safeParse(plan);
      if (!parsedResult.success) {
        const fallback = CopilotPlanSchema.parse(heuristicPlan(question));
        return { ...fallback, rounds: round };
      }
      const parsed = parsedResult.data;
      if (!isExecutablePlan(parsed)) {
        plan = heuristicPlan(question);
        return { ...CopilotPlanSchema.parse(plan), rounds: round };
      }
      if (parsed.resolved) return { ...parsed, rounds: round };
    }
    return { ...plan, resolved: false, clarification: 'The question could not be fully resolved from the available project history.', rounds: MAX_PLANNER_ROUNDS };
  }

  async executePlan({ plan, projectId, ownerId, question }) {
    const output = [];
    const args = plan.arguments || {};
    for (const tool of plan.tools) {
      const toolArgs = args[tool] || {};
      if (!COPILOT_TOOLS.includes(tool)) throw new ApiError('COPILOT_TOOL_NOT_ALLOWED', 'Planner tool is not allowed.', { statusCode: 422 });
      if (tool === 'get_lineage_overview') output.push({ tool, data: await this.repository.getLineage({ projectId, ownerId }) });
      if (tool === 'get_version') output.push({ tool, data: await this.getVersion(projectId, ownerId, toolArgs.version_ref) });
      if (tool === 'get_path') output.push({ tool, data: await this.getPath(projectId, ownerId, toolArgs.from_ref, toolArgs.to_ref) });
      if (tool === 'get_children') output.push({ tool, data: await this.getChildren(projectId, ownerId, toolArgs.version_ref) });
      if (tool === 'get_subtree') output.push({ tool, data: await this.getSubtree(projectId, ownerId, toolArgs.version_ref, toolArgs.depth) });
      if (tool === 'get_diff') output.push({ tool, data: await this.getDiff(projectId, ownerId, toolArgs.from_ref, toolArgs.to_ref) });
      if (tool === 'search_versions') output.push({ tool, data: await this.searchVersions({ projectId, ownerId, query: toolArgs.query || question, limit: toolArgs.limit || 8 }) });
      if (tool === 'search_memory') output.push({ tool, data: await this.repository.searchCopilotMemories({ projectId, ownerId, query: toolArgs.query || question, types: toolArgs.types }) });
      if (tool === 'list_ai_generations') output.push({ tool, data: await this.repository.listAiGenerations({ projectId, ownerId, limit: toolArgs.limit || 10 }) });
    }
    return output;
  }

  async indexVersion({ ownerId, version }) {
    const content = JSON.stringify({
      sequence: version.sequence,
      summary: version.summary,
      actor_type: version.actor_type,
      actor_model: version.actor_model,
      actions: version.actions || version.action || null
    });
    return this.indexContent({ ownerId, projectId: version.project_id, sourceType: 'version', sourceId: version.id, content });
  }

  async searchVersions({ projectId, ownerId, query, limit }) {
    const keywordResults = await this.repository.searchCopilotVersions({ projectId, ownerId, query, limit });
    try {
      const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.EMBEDDING);
      const embedded = await this.withAiRequest({
        projectId,
        purpose: 'embedding',
        provider,
        model: provider.models.embedding,
        promptPreview: 'Embed a project-scoped Copilot version search query.',
        run: () => provider.embed({ text: query })
      });
      const semantic = await this.repository.searchCopilotEmbeddings?.({ projectId, ownerId, embedding: embedded.embedding, limit });
      if (semantic?.length) return { keyword: keywordResults, semantic };
    } catch {
      // Keyword retrieval remains available when embedding configuration or pgvector is unavailable.
    }
    return keywordResults;
  }

  async withAiRequest({ projectId, purpose, provider, model, promptPreview, run }) {
    await this.assertBudgetAvailable(projectId);
    const startedAt = Date.now();
    try {
      const result = await run();
      const usage = result.usage || {};
      await this.repository.logAiRequest?.({
        projectId, purpose, provider: provider.id, model, status: 'ok', latencyMs: Date.now() - startedAt,
        inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0,
        estimatedCost: usage.estimatedCost || 0, promptPreview: result.promptPreview || promptPreview
      });
      return result;
    } catch (error) {
      await this.repository.logAiRequest?.({ projectId, purpose, provider: provider.id, model, status: 'error', latencyMs: Date.now() - startedAt, errorCode: error.code || 'AI_PROVIDER_FAILED', promptPreview });
      throw error;
    }
  }

  async assertBudgetAvailable(projectId) {
    if (!projectId || (!this.aiConfig.dailyCostLimit && !this.aiConfig.dailyTokenLimit) || !this.repository.getAiUsageForToday) return;
    const usage = await this.repository.getAiUsageForToday({ projectId });
    const costLimit = Number(this.aiConfig.dailyCostLimit || 0);
    const tokenLimit = Number(this.aiConfig.dailyTokenLimit || 0);
    if ((costLimit && usage.cost >= costLimit) || (tokenLimit && usage.tokens >= tokenLimit)) {
      await this.repository.logAiRequest?.({ projectId, purpose: 'budget_guard', provider: 'canopy', status: 'skipped', errorCode: 'AI_BUDGET_EXCEEDED', promptPreview: 'Copilot skipped because the project daily AI budget is exhausted.' });
      throw new ApiError('AI_BUDGET_EXCEEDED', 'Daily AI budget exceeded.', { statusCode: 429 });
    }
  }

  async indexMemory({ ownerId, memory }) {
    return this.indexContent({ ownerId, projectId: memory.project_id, sourceType: 'memory', sourceId: memory.id, content: `${memory.type}: ${memory.statement}\n${memory.rationale || ''}` });
  }

  async indexContent({ ownerId, projectId, sourceType, sourceId, content }) {
    const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.EMBEDDING);
    const model = provider.models.embedding;
    const hash = contentHash(content);
    const existing = await this.repository.getCopilotEmbedding?.({ sourceType, sourceId, embeddingModel: model, schemaVersion: 'copilot-embedding-v1' });
    if (existing?.content_hash === hash) return existing;
    const result = await provider.embed({ text: content });
    return this.repository.upsertCopilotEmbedding({
      projectId, ownerId, sourceType, sourceId, embedding: result.embedding,
      embeddingModel: model, schemaVersion: 'copilot-embedding-v1', contentHash: hash, content
    });
  }

  async getVersion(projectId, ownerId, ref) {
    const lineage = await this.repository.getLineage({ projectId, ownerId });
    const version = resolveVersion(lineage, ref);
    if (!version) throw new ApiError('VERSION_NOT_FOUND', 'Version reference could not be resolved.', { statusCode: 404 });
    return version;
  }

  async getPath(projectId, ownerId, fromRef, toRef) {
    const lineage = await this.repository.getLineage({ projectId, ownerId });
    const from = resolveVersion(lineage, fromRef);
    const to = resolveVersion(lineage, toRef);
    if (!from || !to) throw new ApiError('VERSION_NOT_FOUND', 'Path version reference could not be resolved.', { statusCode: 404 });
    const path = this.semanticDiff
      ? await this.semanticDiff.compareVersions({ ownerId, from, to })
      : { path: null, status: 'declared_only' };
    return { from, to, diff: path };
  }

  async getDiff(projectId, ownerId, fromRef, toRef) {
    return (await this.getPath(projectId, ownerId, fromRef, toRef)).diff;
  }

  async getChildren(projectId, ownerId, ref) {
    const lineage = await this.repository.getLineage({ projectId, ownerId });
    const version = resolveVersion(lineage, ref);
    if (!version) throw new ApiError('VERSION_NOT_FOUND', 'Version reference could not be resolved.', { statusCode: 404 });
    const children = lineage.edges.filter((edge) => edge.parent_version_id === version.id)
      .map((edge) => lineage.versions.find((candidate) => candidate.id === edge.version_id)).filter(Boolean);
    return { version, children };
  }

  async getSubtree(projectId, ownerId, ref, depth = 3) {
    const root = await this.getChildren(projectId, ownerId, ref);
    const descendants = [];
    let frontier = root.children;
    for (let level = 0; level < Math.min(Number(depth) || 3, 8) && frontier.length; level += 1) {
      descendants.push(...frontier);
      const next = [];
      for (const version of frontier) next.push(...(await this.getChildren(projectId, ownerId, version.id)).children);
      frontier = next;
    }
    return { root: root.version, descendants };
  }
}

function heuristicPlan(question) {
  const lower = question.toLowerCase();
  const sequenceRefs = [...question.matchAll(/\bV(\d+)\b/gi)].map((match) => `V${match[1]}`);
  const args = {};
  let tools;
  if (sequenceRefs.length >= 2 && /changed|different|between|why|path|after/.test(lower)) {
    args.get_path = { from_ref: sequenceRefs[0], to_ref: sequenceRefs[1] };
    args.get_diff = { from_ref: sequenceRefs[0], to_ref: sequenceRefs[1] };
    tools = ['get_path', 'get_diff'];
  } else if (sequenceRefs[0] && /memory|decision|preference|reject|constraint|goal|typography|mascot/.test(lower)) {
    args.get_version = { version_ref: sequenceRefs[0] };
    args.search_memory = { query: question, limit: 8 };
    tools = ['get_version', 'search_memory'];
  } else if (/parent|before|based on|came from/.test(lower) && sequenceRefs[0]) {
    args.get_version = { version_ref: sequenceRefs[0] };
    tools = ['get_version'];
  } else if (/derived|descendant|subtree|branch/.test(lower) && sequenceRefs[0]) {
    args.get_subtree = { version_ref: sequenceRefs[0] };
    tools = ['get_subtree'];
  } else if (/memory|decision|preference|reject|constraint|goal|typography/.test(lower)) {
    args.search_memory = { query: question, limit: 8 };
    tools = ['search_memory'];
  } else if (/ai|generated|model|prompt/.test(lower)) {
    args.list_ai_generations = { limit: 10 };
    tools = ['list_ai_generations'];
  } else if (/latest|evolution|overview|history/.test(lower)) {
    tools = ['get_lineage_overview', 'search_versions'];
    args.search_versions = { query: question, limit: 8 };
  } else {
    tools = ['search_versions', 'search_memory'];
    args.search_versions = { query: question, limit: 6 };
    args.search_memory = { query: question, limit: 6 };
  }
  return { tools, arguments: args, resolved: true, clarification: null };
}

function mergePlans(required, proposed) {
  const tools = [...new Set([...(required.tools || []), ...(proposed.tools || [])])];
  return {
    ...proposed,
    tools,
    arguments: { ...(proposed.arguments || {}), ...(required.arguments || {}) },
    resolved: proposed.resolved ?? required.resolved,
    clarification: proposed.clarification ?? required.clarification
  };
}

function isExecutablePlan(plan) {
  if (!plan.tools.every((tool) => COPILOT_TOOLS.includes(tool))) return false;
  const args = plan.arguments || {};
  const required = {
    get_version: ['version_ref'],
    get_path: ['from_ref', 'to_ref'],
    get_diff: ['from_ref', 'to_ref'],
    get_subtree: ['version_ref'],
    get_children: ['version_ref'],
    search_versions: ['query'],
    search_memory: ['query']
  };
  return plan.tools.every((tool) => (required[tool] || []).every((key) => args[tool]?.[key] != null && String(args[tool][key]).trim() !== ''));
}

function resolveVersion(lineage, ref) {
  if (!ref) return null;
  const text = String(ref).trim();
  if (/^[0-9a-f-]{36}$/i.test(text)) return lineage.versions.find((version) => version.id === text) || null;
  const sequence = text.match(/^V(\d+)$/i)?.[1];
  if (sequence) return lineage.versions.find((version) => version.sequence === Number(sequence)) || null;
  if (/latest|current/i.test(text)) return lineage.versions.at(-1) || null;
  return null;
}

function assembleContext(retrieved) {
  const items = [];
  for (const result of retrieved) flattenContext(result.data, result.tool, items);
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  let total = 0;
  const kept = [];
  for (const item of unique) {
    const size = item.text.length;
    if (total + size > CONTEXT_LIMIT) continue;
    total += size;
    kept.push(item);
  }
  return { items: kept, text: kept.map((item) => `${item.id}\n${item.text}`).join('\n\n') };
}

function flattenContext(value, tool, items) {
  if (!value) return;
  if (Array.isArray(value)) return value.forEach((item) => flattenContext(item, tool, items));
  if (value.id && !value.type && (value.sequence !== undefined || value.actor_type || value.asset_id)) {
    items.push({ id: `VERSION:${value.id}`, text: `[VERSION ${value.sequence ? `V${value.sequence}` : value.id} · id=${value.id}] ${JSON.stringify(value)}` });
  }
  if (value.id && value.type && value.statement) items.push({ id: `MEMORY:${value.id}`, text: `[MEMORY ${value.id} · type=${value.type}] ${value.statement}` });
  if (value.cache_key && value.from_version_id) items.push({ id: `DIFF:${value.cache_key}`, text: `[DIFF ${value.from_version_id}:${value.to_version_id}] ${JSON.stringify(value)}` });
  for (const [key, child] of Object.entries(value)) if (child && typeof child === 'object') flattenContext(child, tool, items);
}

function validateCitations(text, citations, context) {
  const allowed = new Set(context.items.map((item) => item.id));
  const tokens = [...String(text).matchAll(/\[\[(VERSION|MEMORY|DIFF):([^\]]+)\]\]/g)];
  const valid = tokens.filter((match) => allowed.has(`${match[1]}:${match[2]}`));
  const invalid = tokens.filter((match) => !allowed.has(`${match[1]}:${match[2]}`));
  const cleaned = String(text).split(/(?<=[.!?])\s+/)
    .filter((sentence) => !invalid.some((match) => sentence.includes(match[0])))
    .join(' ')
    .replace(/\[\[(VERSION|MEMORY|DIFF):([^\]]+)\]\]/g, (whole, kind, id) => allowed.has(`${kind}:${id}`) ? whole : '');
  const normalized = valid.map((match) => ({ kind: match[1].toLowerCase(), id: match[2] }));
  const supplied = citations.filter((citation) => allowed.has(`${citation.kind.toUpperCase()}:${citation.id}`));
  return { text: cleaned.trim(), citations: [...new Map([...normalized, ...supplied].map((item) => [`${item.kind}:${item.id}`, item])).values()], invalidCount: invalid.length };
}

function takeCompleteSentences(text) {
  const sentences = [];
  let remainder = text;
  while (true) {
    const match = remainder.match(/^([\s\S]*?[.!?])(?:\s+|$)/);
    if (!match) break;
    sentences.push(match[1]);
    remainder = remainder.slice(match[0].length);
  }
  return { sentences, remainder };
}

export function citationContextId(kind, id) {
  return `${String(kind).toUpperCase()}:${id}`;
}

export function contentHash(text) {
  return createHash('sha256').update(text).digest('hex');
}
