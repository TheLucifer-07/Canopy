import { createHash } from 'node:crypto';
import { config } from '../lib/config.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { ApiError } from '../lib/errors.js';
import { ERROR_CODES } from '@canopy/config';

function unwrap(result, code = ERROR_CODES.INTERNAL, message = 'Repository operation failed.') {
  if (result.error) {
    throw new ApiError(code, message, {
      details: { supabase_code: result.error.code, supabase_message: result.error.message }
    });
  }
  return result.data;
}

export class SupabaseCoreRepository {
  constructor({ supabase = null, bucket = config.supabase.storageBucket } = {}) {
    this._supabase = supabase;
    this.bucket = bucket;
  }

  get supabase() {
    if (!this._supabase) this._supabase = getSupabaseAdmin();
    return this._supabase;
  }

  async createProject({ ownerId, name, creativeGoal = null }) {
    return unwrap(
      await this.supabase
        .from('projects')
        .insert({ owner_id: ownerId, name, creative_goal: creativeGoal || null })
        .select('*')
        .single()
    );
  }

  async listProjects({ ownerId, limit = 50, cursor }) {
    let query = this.supabase
      .from('projects')
      .select('*')
      .eq('owner_id', ownerId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) query = query.lt('created_at', cursor);
    return unwrap(await query);
  }

  async forkProject({ ownerId, sourceVersionId, name, creativeGoal = null }) {
    return unwrap(
      await this.supabase.rpc('create_project_fork', {
        source_version_id_arg: sourceVersionId,
        owner_id_arg: ownerId,
        name_arg: name,
        creative_goal_arg: creativeGoal
      })
    );
  }

  async getProject({ projectId, ownerId }) {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Project lookup failed.');
    return data;
  }

  async assertProjectOwner({ projectId, ownerId }) {
    const project = await this.getProject({ projectId, ownerId });
    if (!project) throw new ApiError(ERROR_CODES.PROJECT_NOT_FOUND, 'Project not found.', { statusCode: 404 });
    return project;
  }

  async uploadAssetBytes({ projectId, ownerId, bytes, mime }) {
    await this.assertProjectOwner({ projectId, ownerId });
    const detectedMime = detectImageMime(bytes);
    if (!detectedMime || detectedMime !== mime) {
      throw new ApiError('ASSET_UNSUPPORTED_TYPE', 'Uploaded bytes do not match a supported image type.', { statusCode: 415 });
    }

    const contentHash = createHash('sha256').update(bytes).digest('hex');
    const storageKey = `assets/${contentHash.slice(0, 2)}/${contentHash.slice(2, 4)}/${contentHash}`;

    const upload = await this.supabase.storage
      .from(this.bucket)
      .upload(storageKey, bytes, { contentType: mime, upsert: true });

    if (upload.error) {
      throw new ApiError(ERROR_CODES.STORAGE_ERROR, 'Unable to store asset bytes.', {
        details: { storage_message: upload.error.message }
      });
    }

    const asset = unwrap(
      await this.supabase
        .from('assets')
        .upsert({
          content_hash: contentHash,
          media_type: 'image',
          mime,
          storage_key: storageKey,
          byte_size: bytes.length
        }, { onConflict: 'content_hash' })
        .select('*')
        .single()
    );

    await this.grantAssetToProject({ projectId, assetId: asset.id });
    return asset;
  }

  async grantAssetToProject({ projectId, assetId }) {
    unwrap(
      await this.supabase
        .from('project_assets')
        .upsert({ project_id: projectId, asset_id: assetId }, { onConflict: 'project_id,asset_id' })
    );
  }

  async getGrantedAsset({ projectId, ownerId, assetId }) {
    await this.assertProjectOwner({ projectId, ownerId });
    const { data, error } = await this.supabase
      .from('project_assets')
      .select('assets(*)')
      .eq('project_id', projectId)
      .eq('asset_id', assetId)
      .maybeSingle();
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Asset lookup failed.');
    return data?.assets || null;
  }

  async createSignedAssetUrl({ ownerId, assetId }) {
    const { data: grants, error } = await this.supabase
      .from('project_assets')
      .select('assets(*), projects!inner(owner_id)')
      .eq('asset_id', assetId)
      .eq('projects.owner_id', ownerId)
      .limit(1);
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Asset authorization failed.');
    const asset = grants?.[0]?.assets;
    if (!asset) throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset not found.', { statusCode: 404 });

    const signed = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(asset.storage_key, 600);
    if (signed.error) throw new ApiError(ERROR_CODES.STORAGE_ERROR, 'Unable to create signed asset URL.');
    return { asset_id: asset.id, url: signed.data.signedUrl, expires_in: 600 };
  }

  async getIdempotencyRecord({ key, userId, route }) {
    const { data, error } = await this.supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key', key)
      .eq('user_id', userId)
      .eq('route', route)
      .maybeSingle();
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Idempotency lookup failed.');
    return data;
  }

  async storeIdempotencyRecord({ key, userId, route, requestHash, response }) {
    unwrap(
      await this.supabase.from('idempotency_keys').insert({
        key,
        user_id: userId,
        route,
        request_hash: requestHash,
        response
      })
    );
  }

  async createVersion({ projectId, ownerId, assetId, isRoot, parents, actor, action, annotation = {} }) {
    await this.assertProjectOwner({ projectId, ownerId });
    const asset = await this.getGrantedAsset({ projectId, ownerId, assetId });
    if (!asset) throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset not found.', { statusCode: 404 });

    if (!isRoot) {
      for (const parentId of parents.map((parent) => parent.parent_version_id)) {
        const parent = await this.getVersion({ versionId: parentId, ownerId });
        if (!parent || parent.project_id !== projectId) {
          throw new ApiError(ERROR_CODES.INVALID_PARENT, 'Parent version must belong to the same project.', { statusCode: 422 });
        }
      }
    }

    const version = unwrap(
      await this.supabase.rpc('create_core_version', {
        project_id_arg: projectId,
        owner_id_arg: ownerId,
        asset_id_arg: assetId,
        is_root_arg: isRoot,
        parents_arg: parents,
        actor_type_arg: actor.type,
        actor_user_id_arg: actor.userId,
        action_type_arg: action.type,
        action_params_arg: action.params,
        declared_delta_arg: action.declaredDelta,
        replayable_arg: action.replayable,
        surface_arg: action.surface,
        capture_fidelity_arg: action.captureFidelity || 'full',
        source_tool_arg: action.sourceTool || 'canopy-api',
        label_arg: annotation.label || null,
        note_arg: annotation.note || null
      })
    );

    return version;
  }

  async getVersionDetail({ versionId, ownerId }) {
    const version = await this.getVersion({ versionId, ownerId });
    if (!version) return null;
    const action = unwrap(
      await this.supabase
        .from('actions')
        .select('*')
        .eq('version_id', versionId)
        .maybeSingle()
    );
    const parents = unwrap(
      await this.supabase
        .from('version_parents')
        .select('*')
        .eq('version_id', versionId)
        .order('parent_index', { ascending: true })
    );
    const annotation = unwrap(
      await this.supabase
        .from('version_annotations')
        .select('*')
        .eq('version_id', versionId)
        .maybeSingle()
    );
    const asset = unwrap(
      await this.supabase
        .from('assets')
        .select('*')
        .eq('id', version.asset_id)
        .single()
    );
    return { ...version, action, parents, annotation, asset };
  }

  async getVersion({ versionId, ownerId }) {
    const { data, error } = await this.supabase
      .from('versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle();
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Version lookup failed.');
    if (!data) return null;
    await this.assertProjectOwner({ projectId: data.project_id, ownerId });
    return data;
  }

  async createWorkingState({ versionId, ownerId }) {
    const version = await this.getVersion({ versionId, ownerId });
    if (!version) throw new ApiError(ERROR_CODES.VERSION_NOT_FOUND, 'Version not found.', { statusCode: 404 });
    return unwrap(
      await this.supabase
        .from('working_states')
        .upsert({
          project_id: version.project_id,
          user_id: ownerId,
          base_version_id: version.id,
          ops: []
        }, { onConflict: 'project_id,user_id,base_version_id' })
        .select('*')
        .single()
    );
  }

  async getLineage({ projectId, ownerId, limit = 2000 }) {
    await this.assertProjectOwner({ projectId, ownerId });
    const versions = unwrap(
      await this.supabase
        .from('versions')
        .select('*, actions(*), version_annotations(*)')
        .eq('project_id', projectId)
        .order('sequence', { ascending: true })
        .limit(limit)
    );
    const versionIds = versions.map((version) => version.id);
    if (versionIds.length === 0) return { versions: [], edges: [] };

    const edges = unwrap(
      await this.supabase
        .from('version_parents')
        .select('*')
        .in('version_id', versionIds)
        .order('parent_index', { ascending: true })
    );
    return { versions, edges };
  }

  async getLineageForVersions({ versionIds, ownerId }) {
    const versions = [];
    for (const versionId of versionIds) {
      const version = await this.getVersion({ versionId, ownerId });
      if (!version) throw new ApiError(ERROR_CODES.VERSION_NOT_FOUND, 'Version not found.', { statusCode: 404 });
      versions.push(version);
    }
    const projectId = versions[0]?.project_id;
    if (!versions.every((version) => version.project_id === projectId)) {
      throw new ApiError('MERGE_CROSS_PROJECT', 'Merge versions must belong to the same project.', { statusCode: 400 });
    }
    return this.getLineage({ projectId, ownerId });
  }

  async createMemory({ projectId, ownerId, memory }) {
    await this.assertProjectOwner({ projectId, ownerId });
    return unwrap(
      await this.supabase
        .from('memories')
        .insert({
          project_id: projectId,
          type: memory.type,
          statement: memory.statement,
          rationale: memory.rationale || null,
          source_refs: memory.source_refs || {},
          origin: memory.origin,
          status: memory.status,
          created_by_user_id: ownerId
        })
        .select('*')
        .single()
    );
  }

  async getMemory({ memoryId, ownerId }) {
    const { data, error } = await this.supabase
      .from('memories')
      .select('*, projects!inner(owner_id)')
      .eq('id', memoryId)
      .eq('projects.owner_id', ownerId)
      .maybeSingle();
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Memory lookup failed.');
    return data;
  }

  async updateMemoryStatus({ memoryId, ownerId, status }) {
    const memory = await this.getMemory({ memoryId, ownerId });
    if (!memory) throw new ApiError('MEMORY_NOT_FOUND', 'Memory not found.', { statusCode: 404 });
    return unwrap(
      await this.supabase
        .from('memories')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', memoryId)
        .select('*')
        .single()
    );
  }

  async editMemory({ memoryId, ownerId, memory }) {
    const existing = await this.getMemory({ memoryId, ownerId });
    if (!existing) throw new ApiError('MEMORY_NOT_FOUND', 'Memory not found.', { statusCode: 404 });
    const successor = unwrap(
      await this.supabase
        .from('memories')
        .insert({
          project_id: existing.project_id,
          type: existing.type,
          statement: memory.statement,
          rationale: memory.rationale || null,
          source_refs: memory.source_refs || {},
          origin: 'user_authored',
          status: 'active',
          created_by_user_id: ownerId
        })
        .select('*')
        .single()
    );
    await this.supabase
      .from('memories')
      .update({ status: 'superseded', superseded_by_memory_id: successor.id, updated_at: new Date().toISOString() })
      .eq('id', memoryId);
    return successor;
  }

  async listMemories({ projectId, ownerId, type, status }) {
    await this.assertProjectOwner({ projectId, ownerId });
    let query = this.supabase
      .from('memories')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', status || 'active')
      .order('created_at', { ascending: false });
    if (type) query = query.eq('type', type);
    return unwrap(await query);
  }

  async getSemanticDiff({ cacheKey, ownerId }) {
    const { data, error } = await this.supabase
      .from('semantic_diffs')
      .select('*, projects!inner(owner_id)')
      .eq('cache_key', cacheKey)
      .eq('projects.owner_id', ownerId)
      .maybeSingle();
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Diff lookup failed.');
    return data;
  }

  async storeSemanticDiff({ projectId, ownerId, diff }) {
    await this.assertProjectOwner({ projectId, ownerId });
    return unwrap(
      await this.supabase
        .from('semantic_diffs')
        .upsert({
          project_id: projectId,
          from_version_id: diff.from_version_id,
          to_version_id: diff.to_version_id,
          cache_key: diff.cache_key,
          status: diff.status,
          path: diff.path,
          summary: diff.summary,
          facets: diff.facets,
          contribution: diff.contribution,
          discrepancies: diff.discrepancies,
          confidence: diff.confidence,
          evidence_used: diff.evidence_used
        }, { onConflict: 'cache_key' })
        .select('*')
        .single()
    );
  }

  async downloadAssetBytes({ ownerId, assetId }) {
    const { data: grants, error } = await this.supabase
      .from('project_assets')
      .select('assets(*), projects!inner(owner_id)')
      .eq('asset_id', assetId)
      .eq('projects.owner_id', ownerId)
      .limit(1);
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'Asset authorization failed.');
    const asset = grants?.[0]?.assets;
    if (!asset) throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset not found.', { statusCode: 404 });

    const download = await this.supabase.storage.from(this.bucket).download(asset.storage_key);
    if (download.error) throw new ApiError(ERROR_CODES.STORAGE_ERROR, 'Unable to download asset bytes.');
    return {
      asset,
      bytes: Buffer.from(await download.data.arrayBuffer()),
      mime: asset.mime
    };
  }

  async getAiUsageForToday({ projectId }) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { data, error } = await this.supabase
      .from('ai_requests')
      .select('input_tokens, output_tokens, estimated_cost')
      .eq('project_id', projectId)
      .eq('status', 'ok')
      .gte('created_at', since.toISOString());
    if (error) throw new ApiError(ERROR_CODES.INTERNAL, 'AI budget lookup failed.');
    return (data || []).reduce((totals, row) => ({
      tokens: totals.tokens + Number(row.input_tokens || 0) + Number(row.output_tokens || 0),
      cost: totals.cost + Number(row.estimated_cost || 0)
    }), { tokens: 0, cost: 0 });
  }

  async logAiRequest({
    projectId = null,
    purpose,
    provider,
    model = null,
    status,
    latencyMs = null,
    inputTokens = null,
    outputTokens = null,
    estimatedCost = null,
    errorCode = null,
    promptPreview = null
  }) {
    return unwrap(
      await this.supabase
        .from('ai_requests')
        .insert({
          project_id: projectId,
          purpose,
          provider,
          model,
          status,
          latency_ms: latencyMs,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          estimated_cost: estimatedCost,
          error_code: errorCode,
          prompt_preview: promptPreview ? promptPreview.slice(0, 200) : null
        })
        .select('*')
        .single()
    );
  }
}

function detectImageMime(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
