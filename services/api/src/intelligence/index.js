import { createHash } from 'node:crypto';
import { ERROR_CODES } from '@canopy/config';
import {
  buildDeclaredDiff,
  collectPathVersionIds
} from '@canopy/domain';
import { config } from '../lib/config.js';
import { ApiError } from '../lib/errors.js';
import {
  AI_CAPABILITIES,
  FACET_SCHEMA_VERSION,
  OBSERVED_FACETS,
  ProviderUnavailableError
} from '../providers/index.js';

export class SemanticDiffService {
  constructor({ repository, providerRegistry, aiConfig = config.ai }) {
    this.repository = repository;
    this.providerRegistry = providerRegistry;
    this.aiConfig = aiConfig;
  }

  cacheKey({ fromVersionId, toVersionId }) {
    const modelIds = this.providerRegistry.modelIdsForCache?.() || [];
    return createHash('sha256')
      .update(JSON.stringify({
        from_id: fromVersionId,
        to_id: toVersionId,
        facet_schema_version: FACET_SCHEMA_VERSION,
        diff_model_ids: modelIds
      }))
      .digest('hex');
  }

  async compareVersions({ ownerId, from, to, forceRefresh = false }) {
    const cacheKey = this.cacheKey({ fromVersionId: from.id, toVersionId: to.id });
    if (!forceRefresh) {
      const cached = await this.repository.getSemanticDiff?.({ cacheKey, ownerId });
      if (cached) return cached;
    }

    const lineage = await this.repository.getLineage({ projectId: from.project_id, ownerId });
    const pathVersionIds = collectPathVersionIds({ fromVersionId: from.id, toVersionId: to.id, edges: lineage.edges });
    const declared = buildDeclaredDiff({
      fromVersionId: from.id,
      toVersionId: to.id,
      pathVersionIds,
      versions: lineage.versions
    });
    const pathVersions = pathVersionIds
      ? pathVersionIds.map((id) => lineage.versions.find((version) => version.id === id)).filter(Boolean)
      : [];

    const pathEvidence = pathVersionIds ? await this.tryPathSummary({ projectId: from.project_id, pathVersions }) : null;
    const observedEvidence = await this.tryObservedDelta({ projectId: from.project_id, ownerId, from, to });
    const reconciled = reconcileEvidence({
      declared,
      pathEvidence,
      observedEvidence,
      providerRegistry: this.providerRegistry
    });

    const diff = {
      ...reconciled,
      cache_key: cacheKey,
      from_version_id: from.id,
      to_version_id: to.id
    };
    return this.repository.storeSemanticDiff({ projectId: from.project_id, ownerId, diff });
  }

  async tryPathSummary({ projectId, pathVersions }) {
    try {
      const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.PATH_SUMMARY);
      return await this.withAiRequest({
        projectId,
        purpose: 'path_summary',
        provider,
        model: provider.models.summary,
        promptPreview: 'Summarize ordered declared deltas for semantic diff.',
        run: () => provider.summarizePath({ pathVersions })
      });
    } catch (error) {
      return providerFailure('path', error);
    }
  }

  async tryObservedDelta({ projectId, ownerId, from, to }) {
    try {
      const provider = this.providerRegistry.forCapability(AI_CAPABILITIES.OBSERVED_DELTA);
      if (!this.repository.downloadAssetBytes) {
        throw new ProviderUnavailableError(AI_CAPABILITIES.OBSERVED_DELTA, { reason: 'asset_download_unavailable' });
      }
      const [fromImage, toImage] = await Promise.all([
        this.repository.downloadAssetBytes({ ownerId, assetId: from.asset_id }),
        this.repository.downloadAssetBytes({ ownerId, assetId: to.asset_id })
      ]);
      return await this.withAiRequest({
        projectId,
        purpose: 'vision_diff',
        provider,
        model: provider.models.vision,
        promptPreview: 'Compare two rendered assets using the Canopy semantic diff facet schema.',
        run: () => provider.compareImages({ fromImage, toImage })
      });
    } catch (error) {
      return providerFailure('observed', error);
    }
  }

  async withAiRequest({ projectId, purpose, provider, model, promptPreview, run }) {
    await this.assertBudgetAvailable(projectId);
    const startedAt = Date.now();
    try {
      const result = await run();
      const usage = result.usage || {};
      await this.repository.logAiRequest?.({
        projectId,
        purpose,
        provider: provider.id,
        model,
        status: 'ok',
        latencyMs: Date.now() - startedAt,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        estimatedCost: usage.estimatedCost || 0,
        promptPreview: result.promptPreview || promptPreview
      });
      return result;
    } catch (error) {
      await this.repository.logAiRequest?.({
        projectId,
        purpose,
        provider: provider.id,
        model,
        status: 'error',
        latencyMs: Date.now() - startedAt,
        errorCode: error.code || 'AI_PROVIDER_FAILED',
        promptPreview
      });
      throw error;
    }
  }

  async assertBudgetAvailable(projectId) {
    const costLimit = Number(this.aiConfig.dailyCostLimit || 0);
    const tokenLimit = Number(this.aiConfig.dailyTokenLimit || 0);
    if ((!costLimit && !tokenLimit) || !this.repository.getAiUsageForToday) return;
    const usage = await this.repository.getAiUsageForToday({ projectId });
    if ((costLimit && usage.cost >= costLimit) || (tokenLimit && usage.tokens >= tokenLimit)) {
      await this.repository.logAiRequest?.({
        projectId,
        purpose: 'budget_guard',
        provider: 'canopy',
        model: null,
        status: 'skipped',
        errorCode: ERROR_CODES.AI_BUDGET_EXCEEDED,
        promptPreview: 'AI work skipped because the project daily AI budget is exhausted.'
      });
      throw new ApiError(ERROR_CODES.AI_BUDGET_EXCEEDED, 'Daily AI budget exceeded.', { statusCode: 429 });
    }
  }
}

function reconcileEvidence({ declared, pathEvidence, observedEvidence }) {
  const declaredFacets = normalizeDeclaredFacets(declared.facets?.declared || []);
  const observedFacets = observedEvidence?.facets || null;
  const facets = {};
  const discrepancies = [
    ...(pathEvidence?.error ? [sourceFailure('path', pathEvidence)] : []),
    ...(observedEvidence?.error ? [sourceFailure('observed', observedEvidence)] : [])
  ];

  for (const facet of OBSERVED_FACETS) {
    const declaredFacet = declaredFacets[facet] || null;
    const observedFacet = observedFacets?.[facet] || null;
    const declaredChanged = Boolean(declaredFacet?.changed);
    const observedChanged = Boolean(observedFacet?.changed);
    const evidence = declaredChanged && observedChanged ? 'both' : declaredChanged ? 'declared' : observedChanged ? 'observed' : 'none';
    facets[facet] = {
      changed: declaredChanged || observedChanged,
      evidence,
      declared: declaredFacet,
      observed: observedFacet,
      confidence: facetConfidence({ declaredChanged, observedChanged, observedFacet })
    };
    if (declaredChanged !== observedChanged && (declaredChanged || observedChanged)) {
      discrepancies.push({
        facet,
        declared: declaredFacet,
        observed: observedFacet,
        evidence_sources: [declaredChanged ? 'declared' : null, observedChanged ? 'observed' : null].filter(Boolean),
        note: 'Declared action evidence and observed visual evidence disagree for this facet.'
      });
    }
  }

  const evidenceUsed = ['declared'];
  if (declared.path) evidenceUsed.push('path');
  if (pathEvidence && !pathEvidence.error && !evidenceUsed.includes('path')) evidenceUsed.push('path');
  if (observedEvidence && !observedEvidence.error) evidenceUsed.push('observed');

  const pathFailed = Boolean(pathEvidence?.error);
  const observedFailed = Boolean(observedEvidence?.error);
  const status = statusFor({ path: declared.path, pathFailed, observedFailed, observedAvailable: Boolean(observedEvidence && !observedEvidence.error) });
  const confidence = {
    declared: declared.confidence?.declared || 0.2,
    path: pathEvidence && !pathEvidence.error ? pathEvidence.confidence : declared.confidence?.path || 0,
    observed: observedEvidence && !observedEvidence.error ? averageObservedConfidence(observedEvidence.facets) : 0,
    overall: overallConfidence({ declared, pathEvidence, observedEvidence, discrepancies })
  };

  return {
    id: null,
    status,
    path: declared.path,
    summary: buildSummary({ declared, pathEvidence, observedEvidence }),
    facets,
    contribution: {
      ...declared.contribution,
      path: pathEvidence && !pathEvidence.error ? {
        provider: pathEvidence.provider,
        model: pathEvidence.model,
        summary: pathEvidence.summary
      } : null,
      observed: observedEvidence && !observedEvidence.error ? {
        provider: observedEvidence.provider,
        model: observedEvidence.model,
        summary: observedEvidence.summary
      } : null
    },
    discrepancies,
    confidence,
    evidence_used: evidenceUsed
  };
}

function normalizeDeclaredFacets(items) {
  const facets = {};
  for (const item of items) {
    for (const facet of facetsForOperation(item.description || item.kind)) {
      facets[facet] = {
        changed: true,
        description: item.description || item.kind,
        evidence: 'declared',
        params: item.params || {}
      };
    }
  }
  return facets;
}

function facetsForOperation(operation) {
  if (operation === 'adjust') return ['lighting', 'color'];
  if (operation === 'crop') return ['composition', 'framing'];
  if (operation === 'rotate' || operation === 'flip') return ['framing', 'composition'];
  if (operation === 'text') return ['typography', 'objects'];
  if (operation === 'import') return ['subject', 'background', 'composition'];
  return ['composition'];
}

function providerFailure(source, error) {
  return {
    error: true,
    source,
    code: error.code || 'AI_PROVIDER_FAILED',
    message: error.message,
    retryable: Boolean(error.retryable)
  };
}

function sourceFailure(source, failure) {
  return {
    facet: null,
    declared: null,
    observed: null,
    evidence_sources: [source],
    note: `${source} evidence unavailable: ${failure.code}`
  };
}

function statusFor({ path, pathFailed, observedFailed, observedAvailable }) {
  if (pathFailed && observedFailed) return 'declared_only';
  if (!path && observedAvailable) return 'partial';
  if (observedFailed) return path ? 'partial' : 'declared_only';
  if (pathFailed) return 'partial';
  return observedAvailable ? 'complete' : 'declared_only';
}

function buildSummary({ declared, pathEvidence, observedEvidence }) {
  if (pathEvidence && !pathEvidence.error && pathEvidence.summary) return pathEvidence.summary;
  if (observedEvidence && !observedEvidence.error && observedEvidence.summary) return observedEvidence.summary;
  return declared.summary;
}

function facetConfidence({ declaredChanged, observedChanged, observedFacet }) {
  if (declaredChanged && observedChanged) return Math.min(1, 0.85 + ((observedFacet?.confidence || 0) * 0.1));
  if (declaredChanged) return 0.75;
  if (observedChanged) return Math.min(0.7, observedFacet?.confidence || 0.6);
  return 0.4;
}

function averageObservedConfidence(facets) {
  const values = Object.values(facets || {}).map((facet) => Number(facet.confidence || 0)).filter(Boolean);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function overallConfidence({ declared, pathEvidence, observedEvidence, discrepancies }) {
  let confidence = declared.path ? 0.55 : 0.35;
  if (pathEvidence && !pathEvidence.error) confidence += 0.15;
  if (observedEvidence && !observedEvidence.error) confidence += 0.2;
  confidence -= Math.min(0.3, discrepancies.filter((item) => item.facet).length * 0.06);
  if (!declared.path) confidence = Math.min(confidence, 0.5);
  return Math.max(0.1, Math.min(0.95, confidence));
}
