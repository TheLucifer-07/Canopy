import { createHash } from 'node:crypto';
import { ACTION_TYPES, ACTOR_TYPES, ERROR_CODES, MEMORY_STATUS } from '@canopy/config';
import {
  assertHumanActor,
  buildDeclaredDelta,
  collectOperationsForPath,
  collectPathVersionIds,
  composeMergeOperations,
  detectMergeConflicts,
  findLowestCommonAncestor,
  summarizeLineage,
  validateMemoryInput,
  validateMemoryEditInput,
  validateParentSet
} from '@canopy/domain';
import { ApiError } from '../lib/errors.js';
import { SemanticDiffService } from '../intelligence/index.js';

export class CoreOperations {
  constructor({ repository, providerRegistry }) {
    this.repository = repository;
    this.semanticDiff = providerRegistry
      ? new SemanticDiffService({ repository, providerRegistry })
      : null;
  }

  async createProject(auth, input) {
    return this.repository.createProject({
      ownerId: auth.userId,
      name: input.name,
      creativeGoal: input.creative_goal || null
    });
  }

  async listProjects(auth, query) {
    return this.repository.listProjects({
      ownerId: auth.userId,
      limit: query.limit,
      cursor: query.cursor
    });
  }

  async getProject(auth, projectId) {
    return this.repository.assertProjectOwner({ projectId, ownerId: auth.userId });
  }

  async updateProject(auth, projectId, input) {
    return this.repository.updateProject({
      projectId,
      ownerId: auth.userId,
      name: input.name,
      creativeGoal: input.creative_goal
    });
  }

  async archiveProject(auth, projectId) {
    return this.repository.archiveProject({ projectId, ownerId: auth.userId });
  }

  async forkProject(auth, input) {
    return this.repository.forkProject({
      ownerId: auth.userId,
      sourceVersionId: input.source_version_id,
      name: input.name,
      creativeGoal: input.creative_goal || null
    });
  }

  async uploadAsset(auth, { projectId, bytes, mime }) {
    return this.repository.uploadAssetBytes({ projectId, ownerId: auth.userId, bytes, mime });
  }

  async withIdempotency(auth, { key, route, payload }, createResponse) {
    if (!key) return createResponse();
    if (!this.repository.getIdempotencyRecord || !this.repository.storeIdempotencyRecord) {
      return createResponse();
    }

    const requestHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const existing = await this.repository.getIdempotencyRecord({
      key,
      userId: auth.userId,
      route
    });

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ApiError(ERROR_CODES.IDEMPOTENCY_KEY_REUSED, 'Idempotency-Key was reused with a different request.', { statusCode: 409 });
      }
      return existing.response;
    }

    const response = await createResponse();
    await this.repository.storeIdempotencyRecord({
      key,
      userId: auth.userId,
      route,
      requestHash,
      response
    });
    return response;
  }

  async createRootVersion(auth, projectId, input, options = {}) {
    return this.withIdempotency(auth, {
      key: options.idempotencyKey,
      route: `POST /v1/projects/${projectId}/versions/import`,
      payload: input
    }, () => this.createRootVersionOnce(auth, projectId, input));
  }

  async createRootVersionOnce(auth, projectId, input) {
    const actor = assertHumanActor({ type: ACTOR_TYPES.HUMAN, userId: auth.userId });
    return this.repository.createVersion({
      projectId,
      ownerId: auth.userId,
      assetId: input.asset_id,
      isRoot: true,
      parents: validateParentSet({ isRoot: true, parents: [] }),
      actor,
      action: {
        type: ACTION_TYPES.IMPORT,
        params: { asset_id: input.asset_id },
        declaredDelta: buildDeclaredDelta(ACTION_TYPES.IMPORT, { asset_id: input.asset_id }),
        replayable: true,
        surface: 'api',
        captureFidelity: 'full',
        sourceTool: 'canopy-import'
      },
      annotation: { label: input.label, note: input.note }
    });
  }

  async commitVersion(auth, projectId, input, options = {}) {
    return this.withIdempotency(auth, {
      key: options.idempotencyKey,
      route: `POST /v1/projects/${projectId}/versions`,
      payload: input
    }, () => this.commitVersionOnce(auth, projectId, input));
  }

  async commitVersionOnce(auth, projectId, input) {
    const actor = assertHumanActor({ type: ACTOR_TYPES.HUMAN, userId: auth.userId });
    const baseVersion = await this.repository.getVersion({ versionId: input.base_version_id, ownerId: auth.userId });
    if (!baseVersion || baseVersion.project_id !== projectId) {
      throw new ApiError(ERROR_CODES.VERSION_NOT_FOUND, 'Base version not found.', { statusCode: 404 });
    }
    const assetId = input.asset_id || baseVersion?.asset_id;
    const parentIds = input.parents || [input.base_version_id];
    const parents = validateParentSet({ isRoot: false, parents: parentIds });

    return this.repository.createVersion({
      projectId,
      ownerId: auth.userId,
      assetId,
      isRoot: false,
      parents,
      actor,
      action: {
        type: ACTION_TYPES.COMMIT,
        params: { base_version_id: input.base_version_id, ops: input.ops },
        declaredDelta: buildDeclaredDelta(ACTION_TYPES.COMMIT, { ops: input.ops }),
        replayable: true,
        surface: 'api',
        captureFidelity: 'full',
        sourceTool: 'canopy-commit'
      },
      annotation: { label: input.label, note: input.note }
    });
  }

  async mergeVersions(auth, projectId, input, options = {}) {
    return this.withIdempotency(auth, {
      key: options.idempotencyKey,
      route: `POST /v1/projects/${projectId}/merge`,
      payload: input
    }, async () => {
      const lineage = await this.repository.getLineageForVersions({
        versionIds: input.source_version_ids,
        ownerId: auth.userId
      });
      const sourceVersions = input.source_version_ids.map((id) => lineage.versions.find((version) => version.id === id));
      if (!sourceVersions.every((version) => version?.project_id === projectId)) {
        throw new ApiError('INVALID_MERGE', 'All merge versions must belong to the target project.', { statusCode: 400 });
      }
      const lcaId = findLowestCommonAncestor({ versionIds: input.source_version_ids, edges: lineage.edges });
      if (!lcaId) throw new ApiError('INVALID_MERGE', 'No common ancestor was found.', { statusCode: 400 });
      const operationSets = input.source_version_ids.map((versionId) => {
        const path = collectPathVersionIds({ fromVersionId: lcaId, toVersionId: versionId, edges: lineage.edges });
        return collectOperationsForPath({ pathVersionIds: path, versions: lineage.versions });
      });
      const conflicts = detectMergeConflicts(operationSets);
      const mergedOps = composeMergeOperations(operationSets, input.resolutions || {});
      const lca = lineage.versions.find((version) => version.id === lcaId);
      const actor = assertHumanActor({ type: ACTOR_TYPES.HUMAN, userId: auth.userId });
      return this.repository.createVersion({
        projectId,
        ownerId: auth.userId,
        assetId: lca.asset_id,
        isRoot: false,
        parents: validateParentSet({ isRoot: false, parents: input.source_version_ids }),
        actor,
        action: {
          type: ACTION_TYPES.MERGE,
          params: { source_version_ids: input.source_version_ids, lca_id: lcaId, ops: mergedOps, conflicts },
          declaredDelta: buildDeclaredDelta(ACTION_TYPES.MERGE, { ops: mergedOps, conflicts }),
          replayable: conflicts.length === 0,
          surface: 'api',
          captureFidelity: 'full',
          sourceTool: 'canopy-merge'
        },
        annotation: { label: input.label, note: input.note }
      });
    });
  }

  async continueFrom(auth, versionId) {
    return this.repository.createWorkingState({ versionId, ownerId: auth.userId });
  }

  async getLineage(auth, projectId) {
    const lineage = await this.repository.getLineage({ projectId, ownerId: auth.userId });
    return { ...lineage, ...summarizeLineage(lineage) };
  }

  async createMemory(auth, projectId, input) {
    const memory = validateMemoryInput({
      ...input,
      origin: 'user_authored',
      status: MEMORY_STATUS.ACTIVE
    });
    return this.repository.createMemory({ projectId, ownerId: auth.userId, memory });
  }

  async proposeMemory(auth, projectId, input) {
    const memory = validateMemoryInput({
      ...input,
      origin: 'ai_extracted',
      status: MEMORY_STATUS.PROPOSED
    });
    return this.repository.createMemory({ projectId, ownerId: auth.userId, memory });
  }

  async listMemories(auth, projectId, query) {
    return this.repository.listMemories({ projectId, ownerId: auth.userId, ...query });
  }

  async confirmMemory(auth, memoryId) {
    return this.repository.updateMemoryStatus({ memoryId, ownerId: auth.userId, status: MEMORY_STATUS.ACTIVE });
  }

  async archiveMemory(auth, memoryId) {
    return this.repository.updateMemoryStatus({ memoryId, ownerId: auth.userId, status: MEMORY_STATUS.ARCHIVED });
  }

  async getMemory(auth, memoryId) {
    const memory = await this.repository.getMemory({ memoryId, ownerId: auth.userId });
    if (!memory) {
      throw new ApiError('MEMORY_NOT_FOUND', 'Memory not found.', { statusCode: 404 });
    }
    return memory;
  }

  async editMemory(auth, memoryId, input) {
    const memory = validateMemoryEditInput(input);
    return this.repository.editMemory({ memoryId, ownerId: auth.userId, memory });
  }

  async getProjectAssets(auth, projectId) {
    return this.repository.getProjectAssets({ projectId, ownerId: auth.userId });
  }

  async getAssetDetail(auth, assetId) {
    return this.repository.getAssetDetail({ assetId, ownerId: auth.userId });
  }

  async getAssetUrl(auth, assetId) {
    return this.repository.createSignedAssetUrl({ ownerId: auth.userId, assetId });
  }

  async getVersionDetail(auth, versionId) {
    const detail = await this.repository.getVersionDetail({ versionId, ownerId: auth.userId });
    if (!detail) {
      throw new ApiError(ERROR_CODES.VERSION_NOT_FOUND, 'Version not found.', { statusCode: 404 });
    }
    return detail;
  }

  async createSemanticDiff(auth, input) {
    if (input.from_version_id === input.to_version_id) {
      throw new ApiError('SAME_VERSION_COMPARISON', 'Cannot compare a version with itself. Please select two distinct versions.', { statusCode: 422 });
    }
    const from = await this.repository.getVersion({ versionId: input.from_version_id, ownerId: auth.userId });
    const to = await this.repository.getVersion({ versionId: input.to_version_id, ownerId: auth.userId });
    if (!from || !to || from.project_id !== to.project_id) {
      throw new ApiError('DIFF_NOT_AVAILABLE', 'Versions must be visible and belong to the same project.', { statusCode: 404 });
    }
    if (!this.semanticDiff) {
      throw new ApiError('DIFF_NOT_AVAILABLE', 'Semantic diff service is not available.', { statusCode: 503 });
    }
    return this.semanticDiff.compareVersions({
      ownerId: auth.userId,
      from,
      to,
      forceRefresh: input.force_refresh
    });
  }
}
