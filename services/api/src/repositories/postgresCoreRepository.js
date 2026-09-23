import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { config } from '../lib/config.js';
import { ApiError } from '../lib/errors.js';
import { issueAccessToken } from '../lib/auth.js';
import { ERROR_CODES } from '@canopy/config';

const { Pool } = pg;

function rows(result) { return result.rows; }
function one(result) { return result.rows[0] || null; }
function vector(value) { return `[${value.join(',')}]`; }
function searchTerms(query) {
  const stop = new Set(['using', 'project', 'history', 'only', 'what', 'which', 'cite', 'memory', 'version', 'recorded', 'does', 'did', 'and', 'the', 'that', 'this', 'from', 'with']);
  return [...new Set(String(query).toLowerCase().match(/[a-z0-9]+/g) || [])].filter((term) => term.length > 2 && !stop.has(term));
}

export class PostgresCoreRepository {
  constructor({ pool = null, storageRoot = config.storage.root } = {}) {
    this.pool = pool || new Pool(config.database.url ? { connectionString: config.database.url } : {
      host: config.database.host, port: config.database.port, database: config.database.database,
      user: config.database.user, password: config.database.password, ssl: config.database.ssl ? { rejectUnauthorized: false } : false
    });
    this.storageRoot = storageRoot;
  }

  async createProject({ ownerId, name, creativeGoal = null }) { return one(await this.pool.query('INSERT INTO projects(owner_id,name,creative_goal) VALUES($1,$2,$3) RETURNING *', [ownerId, name, creativeGoal])); }
  async listProjects({ ownerId, limit = 50, cursor }) { const q = cursor ? ['SELECT * FROM projects WHERE owner_id=$1 AND archived_at IS NULL AND created_at<$2 ORDER BY created_at DESC LIMIT $3', [ownerId, cursor, limit]] : ['SELECT * FROM projects WHERE owner_id=$1 AND archived_at IS NULL ORDER BY created_at DESC LIMIT $2', [ownerId, limit]]; return rows(await this.pool.query(...q)); }
  async getProject({ projectId, ownerId }) { return one(await this.pool.query('SELECT * FROM projects WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL', [projectId, ownerId])); }
  async assertProjectOwner({ projectId, ownerId }) { const project = await this.getProject({ projectId, ownerId }); if (!project) throw new ApiError(ERROR_CODES.PROJECT_NOT_FOUND, 'Project not found.', { statusCode: 404 }); return project; }
  async updateProject({ projectId, ownerId, name, creativeGoal }) {
    const project = await this.assertProjectOwner({ projectId, ownerId });
    return one(await this.pool.query(
      'UPDATE projects SET name=$3, creative_goal=$4, updated_at=now() WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL RETURNING *',
      [projectId, ownerId, name ?? project.name, creativeGoal === undefined ? project.creative_goal : creativeGoal]
    ));
  }
  async archiveProject({ projectId, ownerId }) {
    const project = one(await this.pool.query(
      'UPDATE projects SET archived_at=now(), updated_at=now() WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL RETURNING *',
      [projectId, ownerId]
    ));
    if (!project) throw new ApiError(ERROR_CODES.PROJECT_NOT_FOUND, 'Project not found.', { statusCode: 404 });
    return project;
  }

  async uploadAssetBytes({ projectId, ownerId, bytes, mime }) {
    await this.assertProjectOwner({ projectId, ownerId });
    const detected = detectImageMime(bytes); if (detected !== mime) throw new ApiError('ASSET_UNSUPPORTED_TYPE', 'Uploaded bytes do not match a supported image type.', { statusCode: 415 });
    const hash = createHash('sha256').update(bytes).digest('hex'); const key = `assets/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}`; const file = join(this.storageRoot, key);
    await mkdir(join(this.storageRoot, `assets/${hash.slice(0, 2)}/${hash.slice(2, 4)}`), { recursive: true }); await writeFile(file, bytes);
    const asset = one(await this.pool.query(`INSERT INTO assets(content_hash,media_type,mime,storage_key,byte_size) VALUES($1,'image',$2,$3,$4) ON CONFLICT(content_hash) DO UPDATE SET mime=EXCLUDED.mime RETURNING *`, [hash, mime, key, bytes.length]));
    await this.grantAssetToProject({ projectId, assetId: asset.id }); return asset;
  }
  async grantAssetToProject({ projectId, assetId }) { await this.pool.query('INSERT INTO project_assets(project_id,asset_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [projectId, assetId]); }
  async getGrantedAsset({ projectId, ownerId, assetId }) { await this.assertProjectOwner({ projectId, ownerId }); return one(await this.pool.query('SELECT a.* FROM assets a JOIN project_assets pa ON pa.asset_id=a.id WHERE pa.project_id=$1 AND a.id=$2', [projectId, assetId])); }
  async getProjectAssets({ projectId, ownerId }) {
    await this.assertProjectOwner({ projectId, ownerId });
    const rows = (await this.pool.query(`
      SELECT
        a.id,
        a.content_hash,
        a.media_type,
        a.mime,
        a.width,
        a.height,
        a.byte_size,
        a.created_at,
        pa.granted_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', v.id,
                'sequence', v.sequence,
                'label', COALESCE(va.label, 'V' || v.sequence),
                'action_type', COALESCE(act.type, 'edit'),
                'created_at', v.created_at
              ) ORDER BY v.sequence ASC
            )
            FROM versions v
            LEFT JOIN version_annotations va ON va.version_id = v.id
            LEFT JOIN actions act ON act.version_id = v.id
            WHERE v.project_id = pa.project_id AND v.asset_id = a.id
          ),
          '[]'::json
        ) AS related_versions
      FROM assets a
      JOIN project_assets pa ON pa.asset_id = a.id
      WHERE pa.project_id = $1
      ORDER BY pa.granted_at DESC, a.created_at DESC
    `, [projectId])).rows;

    const token = issueAccessToken({ id: ownerId, email: `assets-viewer-${projectId}` });
    return rows.map((asset) => ({
      ...asset,
      url: `${config.storage.publicBaseUrl}/assets/${asset.id}/content?token=${token}`
    }));
  }
  async getAssetDetail({ assetId, ownerId }) {
    const asset = one(await this.pool.query(`
      SELECT
        a.id,
        a.content_hash,
        a.media_type,
        a.mime,
        a.width,
        a.height,
        a.byte_size,
        a.created_at,
        pa.project_id,
        pa.granted_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', v.id,
                'sequence', v.sequence,
                'project_id', v.project_id,
                'label', COALESCE(va.label, 'V' || v.sequence),
                'action_type', COALESCE(act.type, 'edit'),
                'created_at', v.created_at
              ) ORDER BY v.sequence ASC
            )
            FROM versions v
            LEFT JOIN version_annotations va ON va.version_id = v.id
            LEFT JOIN actions act ON act.version_id = v.id
            WHERE v.asset_id = a.id
          ),
          '[]'::json
        ) AS related_versions
      FROM assets a
      JOIN project_assets pa ON pa.asset_id = a.id
      JOIN projects p ON p.id = pa.project_id
      WHERE a.id = $1 AND p.owner_id = $2
      LIMIT 1
    `, [assetId, ownerId]));

    if (!asset) {
      throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset not found.', { statusCode: 404 });
    }

    const token = issueAccessToken({ id: ownerId, email: `asset-viewer-${asset.id}` });
    return {
      ...asset,
      url: `${config.storage.publicBaseUrl}/assets/${asset.id}/content?token=${token}`
    };
  }
  async createSignedAssetUrl({ ownerId, assetId }) {
    const asset = one(await this.pool.query('SELECT a.* FROM assets a JOIN project_assets pa ON pa.asset_id=a.id JOIN projects p ON p.id=pa.project_id WHERE a.id=$1 AND p.owner_id=$2 LIMIT 1', [assetId, ownerId]));
    if (!asset) throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset not found.', { statusCode: 404 });
    const token = issueAccessToken({ id: ownerId, email: `asset-viewer-${assetId}` });
    return { asset_id: asset.id, url: `${config.storage.publicBaseUrl}/assets/${asset.id}/content?token=${token}`, expires_in: config.auth.tokenTtlSeconds || 600 };
  }
  async downloadAssetBytes({ ownerId, assetId }) {
    const asset = one(await this.pool.query('SELECT a.* FROM assets a JOIN project_assets pa ON pa.asset_id=a.id JOIN projects p ON p.id=pa.project_id WHERE a.id=$1 AND p.owner_id=$2 LIMIT 1', [assetId, ownerId]));
    if (!asset) throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset not found.', { statusCode: 404 });
    try {
      const bytes = await readFile(join(this.storageRoot, asset.storage_key));
      return { asset, bytes, mime: asset.mime };
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND, 'Asset content file not found in storage.', { statusCode: 404 });
      }
      throw err;
    }
  }

  async getIdempotencyRecord({ key, userId, route }) { return one(await this.pool.query('SELECT * FROM idempotency_keys WHERE key=$1 AND user_id=$2 AND route=$3', [key, userId, route])); }
  async storeIdempotencyRecord({ key, userId, route, requestHash, response }) { await this.pool.query('INSERT INTO idempotency_keys(key,user_id,route,request_hash,response) VALUES($1,$2,$3,$4,$5)', [key,userId,route,requestHash,response]); }

  async createVersion({ projectId, ownerId, assetId, isRoot, parents, actor, action, annotation = {} }) {
    const client = await this.pool.connect(); try { await client.query('BEGIN');
      const project = one(await client.query('SELECT * FROM projects WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL FOR UPDATE', [projectId,ownerId])); if (!project) throw new ApiError(ERROR_CODES.PROJECT_NOT_FOUND, 'Project not found.', { statusCode:404 });
      const asset = one(await client.query('SELECT a.* FROM assets a JOIN project_assets pa ON pa.asset_id=a.id WHERE pa.project_id=$1 AND a.id=$2', [projectId,assetId])); if (!asset) throw new ApiError(ERROR_CODES.ASSET_NOT_FOUND,'Asset not found.',{statusCode:404});
      if (!isRoot) for (const parent of parents) { const p=one(await client.query('SELECT v.* FROM versions v JOIN projects pr ON pr.id=v.project_id WHERE v.id=$1 AND pr.owner_id=$2 AND v.project_id=$3',[parent.parent_version_id,ownerId,projectId])); if(!p) throw new ApiError(ERROR_CODES.INVALID_PARENT,'Parent version must belong to the same project.',{statusCode:422}); }
      const sequence = project.version_sequence_counter + 1; await client.query('UPDATE projects SET version_sequence_counter=$2,updated_at=now() WHERE id=$1',[projectId,sequence]);
      const v = one(await client.query(
        `INSERT INTO versions(
          project_id,asset_id,sequence,actor_type,actor_user_id,actor_provider,actor_model,
          actor_on_behalf_of_user_id,is_root,capture_fidelity
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          projectId,
          assetId,
          sequence,
          actor.type,
          actor.userId || null,
          actor.provider || null,
          actor.model || null,
          actor.onBehalfOfUserId || null,
          isRoot,
          action.captureFidelity || 'full'
        ]
      ));
      for (const p of (parents||[])) await client.query('INSERT INTO version_parents(version_id,parent_version_id,parent_index,role) VALUES($1,$2,$3,$4)',[v.id,p.parent_version_id,p.parent_index,p.role]);
      await client.query('INSERT INTO actions(version_id,type,params,declared_delta,replayable,surface) VALUES($1,$2,$3,$4,$5,$6)',[v.id,action.type,action.params,action.declaredDelta,action.replayable,action.surface]);
      await client.query(
        'INSERT INTO provenance(version_id,source_tool,provider,model,prompt,parameters,missing_fields) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [v.id,action.sourceTool||'canopy-api',action.provider||null,action.model||null,action.prompt||null,action.params,action.missingFields||[]]
      );
      await client.query('INSERT INTO version_annotations(version_id,label,note) VALUES($1,$2,$3)',[v.id,annotation.label||null,annotation.note||null]); await client.query('COMMIT'); return v;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async getVersion({ versionId, ownerId }) { return one(await this.pool.query('SELECT v.* FROM versions v JOIN projects p ON p.id=v.project_id WHERE v.id=$1 AND p.owner_id=$2',[versionId,ownerId])); }
  async getVersionDetail({ versionId, ownerId }) { const v=await this.getVersion({versionId,ownerId}); if(!v)return null; const [a,p,n,asset]=await Promise.all([this.pool.query('SELECT * FROM actions WHERE version_id=$1',[versionId]),this.pool.query('SELECT * FROM version_parents WHERE version_id=$1 ORDER BY parent_index',[versionId]),this.pool.query('SELECT * FROM version_annotations WHERE version_id=$1',[versionId]),this.pool.query('SELECT * FROM assets WHERE id=$1',[v.asset_id])]); return {...v,action:one(a),parents:rows(p),annotation:one(n),asset:one(asset)}; }
  async createWorkingState({versionId,ownerId}) { const v=await this.getVersion({versionId,ownerId}); if(!v)throw new ApiError(ERROR_CODES.VERSION_NOT_FOUND,'Version not found.',{statusCode:404}); return one(await this.pool.query(`INSERT INTO working_states(project_id,user_id,base_version_id,ops) VALUES($1,$2,$3,'[]') ON CONFLICT(project_id,user_id,base_version_id) DO UPDATE SET updated_at=now() RETURNING *`,[v.project_id,ownerId,v.id])); }
  async getLineage({projectId,ownerId,limit=2000}) { await this.assertProjectOwner({projectId,ownerId}); const vs=rows(await this.pool.query(`SELECT v.*,a.type as action_type,a.params as action_params,a.declared_delta,a.replayable,a.surface,va.label,va.note FROM versions v LEFT JOIN actions a ON a.version_id=v.id LEFT JOIN version_annotations va ON va.version_id=v.id WHERE v.project_id=$1 ORDER BY v.sequence LIMIT $2`,[projectId,limit])); const edges=rows(await this.pool.query('SELECT * FROM version_parents WHERE version_id=ANY($1::uuid[]) ORDER BY parent_index',[vs.map(v=>v.id)])); return {versions:vs.map(v=>({...v,action:v.action_type?{type:v.action_type,params:v.action_params,declared_delta:v.declared_delta,replayable:v.replayable,surface:v.surface}:null,version_annotations:v.label!==undefined?[{label:v.label,note:v.note}]:[] })),edges}; }
  async getLineageForVersions({versionIds,ownerId}) { const vs=await Promise.all(versionIds.map(id=>this.getVersion({versionId:id,ownerId}))); if(vs.some(v=>!v))throw new ApiError(ERROR_CODES.VERSION_NOT_FOUND,'Version not found.',{statusCode:404}); if(!vs.every(v=>v.project_id===vs[0].project_id))throw new ApiError('MERGE_CROSS_PROJECT','Merge versions must belong to same project.',{statusCode:400}); return this.getLineage({projectId:vs[0].project_id,ownerId}); }
  async createMemory({projectId,ownerId,memory}) { await this.assertProjectOwner({projectId,ownerId}); return one(await this.pool.query(`INSERT INTO memories(project_id,type,statement,rationale,source_refs,origin,status,created_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[projectId,memory.type,memory.statement,memory.rationale||null,memory.source_refs||{},memory.origin,memory.status,ownerId])); }
  async getMemory({memoryId,ownerId}) { return one(await this.pool.query('SELECT m.* FROM memories m JOIN projects p ON p.id=m.project_id WHERE m.id=$1 AND p.owner_id=$2',[memoryId,ownerId])); }
  async updateMemoryStatus({memoryId,ownerId,status}) { if(!await this.getMemory({memoryId,ownerId}))throw new ApiError('MEMORY_NOT_FOUND','Memory not found.',{statusCode:404}); return one(await this.pool.query('UPDATE memories SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[memoryId,status])); }
  async editMemory({memoryId,ownerId,memory}) { const old=await this.getMemory({memoryId,ownerId}); if(!old)throw new ApiError('MEMORY_NOT_FOUND','Memory not found.',{statusCode:404}); const next=await this.createMemory({projectId:old.project_id,ownerId,memory:{...memory,origin:'user_authored',status:'active'}}); await this.pool.query('UPDATE memories SET status=\'superseded\',superseded_by_memory_id=$2,updated_at=now() WHERE id=$1',[memoryId,next.id]); return next; }
  async listMemories({projectId,ownerId,type,status}) { await this.assertProjectOwner({projectId,ownerId}); const args=[projectId,status||'active']; let sql='SELECT * FROM memories WHERE project_id=$1 AND status=$2'; if(type){args.push(type);sql+=' AND type=$3';} return rows(await this.pool.query(sql+' ORDER BY created_at DESC',args)); }
  async searchCopilotVersions({projectId,ownerId,query='',limit=8}) {
    const l = (await this.getLineage({projectId,ownerId})).versions;
    const terms = searchTerms(query);
    if (!terms.length) return l.slice(-Math.min(Number(limit)||8, 50));
    const filtered = l.filter(v => {
      const text = JSON.stringify(v).toLowerCase();
      return terms.some(term => text.includes(term));
    });
    return (filtered.length ? filtered : l).slice(-Math.min(Number(limit)||8, 50));
  }
  async searchCopilotMemories({projectId,ownerId,query='',types=null,limit=8}) {
    const l = await this.listMemories({projectId,ownerId});
    const terms = searchTerms(query), allowed = Array.isArray(types) ? new Set(types) : null;
    const filtered = l.filter(m => {
      const text = JSON.stringify(m).toLowerCase();
      return (!allowed || allowed.has(m.type)) && (!terms.length || terms.some(term => text.includes(term)));
    });
    if (filtered.length === 0 && l.length > 0 && /memory|remember|direction|preference|constraint|insight|learning|decision|rule|creative/i.test(query)) {
      return l.slice(0, Math.min(Number(limit) || 8, 50));
    }
    return filtered.slice(0, Math.min(Number(limit) || 8, 50));
  }
  async listAiGenerations({projectId,ownerId,limit=10}) { return (await this.getLineage({projectId,ownerId})).versions.filter(v=>v.actor_type==='model').slice(-Math.min(Number(limit)||10,50)); }
  async createCopilotConversation({projectId,ownerId,title=null}) { await this.assertProjectOwner({projectId,ownerId}); return one(await this.pool.query('INSERT INTO copilot_conversations(project_id,user_id,title) VALUES($1,$2,$3) RETURNING *',[projectId,ownerId,title])); }
  async listCopilotConversations({projectId,ownerId}) { await this.assertProjectOwner({projectId,ownerId}); return rows(await this.pool.query('SELECT * FROM copilot_conversations WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC',[projectId,ownerId])); }
  async getCopilotConversation({conversationId,ownerId}) { const c=one(await this.pool.query('SELECT * FROM copilot_conversations WHERE id=$1 AND user_id=$2',[conversationId,ownerId])); if(!c)return null; return {...c,messages:rows(await this.pool.query('SELECT * FROM copilot_messages WHERE conversation_id=$1 ORDER BY created_at',[conversationId]))}; }

  // New: Get list of versions for a project with basic metadata
  async getProjectVersions({ projectId, ownerId }) {
    // Ensure the requester owns the project
    await this.assertProjectOwner({ projectId, ownerId });
    // Return versions ordered by creation (newest first)
    const rows = await this.pool.query(
      `SELECT v.id, v.created_at, v.asset_id, v.action_id, v.actor_id
       FROM versions v
       JOIN projects p ON p.id = v.project_id
       WHERE v.project_id = $1 AND p.owner_id = $2
       ORDER BY v.created_at DESC`,
      [projectId, ownerId]
    );
    return rows.rows;
  }
  async addCopilotMessage({conversationId,ownerId,role,content,citations=[],toolsUsed=[],grounded=false}) { if(!await this.getCopilotConversation({conversationId,ownerId}))throw new ApiError('COPILOT_CONVERSATION_NOT_FOUND','Conversation not found.',{statusCode:404}); return one(await this.pool.query('INSERT INTO copilot_messages(conversation_id,role,content,citations,tools_used,grounded) VALUES($1,$2,$3,$4::jsonb,$5,$6) RETURNING *',[conversationId,role,content,JSON.stringify(citations),toolsUsed,grounded])); }
  async upsertCopilotEmbedding({projectId,ownerId,sourceType,sourceId,embedding,embeddingModel,schemaVersion,contentHash,content}) { await this.assertProjectOwner({projectId,ownerId}); return one(await this.pool.query(`INSERT INTO copilot_embeddings(project_id,source_type,source_id,embedding,embedding_model,schema_version,content_hash,content) VALUES($1,$2,$3,$4::vector,$5,$6,$7,$8) ON CONFLICT(source_type,source_id,embedding_model,schema_version) DO UPDATE SET embedding=EXCLUDED.embedding,content_hash=EXCLUDED.content_hash,content=EXCLUDED.content RETURNING *`,[projectId,sourceType,sourceId,vector(embedding),embeddingModel,schemaVersion,contentHash,content])); }
  async getCopilotEmbedding({sourceType,sourceId,embeddingModel,schemaVersion}) { return one(await this.pool.query('SELECT * FROM copilot_embeddings WHERE source_type=$1 AND source_id=$2 AND embedding_model=$3 AND schema_version=$4',[sourceType,sourceId,embeddingModel,schemaVersion])); }
  async searchCopilotEmbeddings({projectId,ownerId,embedding,limit=8}) { await this.assertProjectOwner({projectId,ownerId}); return rows(await this.pool.query(`SELECT e.source_type,e.source_id,e.content,1-(e.embedding <=> $2::vector) AS similarity FROM copilot_embeddings e WHERE e.project_id=$1 ORDER BY e.embedding <=> $2::vector LIMIT $3`,[projectId,vector(embedding),Math.min(Math.max(limit,1),50)])); }
  async getSemanticDiff({cacheKey,ownerId}) { return one(await this.pool.query('SELECT d.* FROM semantic_diffs d JOIN projects p ON p.id=d.project_id WHERE d.cache_key=$1 AND p.owner_id=$2',[cacheKey,ownerId])); }
  async storeSemanticDiff({projectId,ownerId,diff}) { await this.assertProjectOwner({projectId,ownerId}); return one(await this.pool.query(`INSERT INTO semantic_diffs(project_id,from_version_id,to_version_id,cache_key,status,path,summary,facets,contribution,discrepancies,confidence,evidence_used) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(cache_key) DO UPDATE SET status=EXCLUDED.status,path=EXCLUDED.path,summary=EXCLUDED.summary,facets=EXCLUDED.facets,contribution=EXCLUDED.contribution,discrepancies=EXCLUDED.discrepancies,confidence=EXCLUDED.confidence,evidence_used=EXCLUDED.evidence_used RETURNING *`,[projectId,diff.from_version_id,diff.to_version_id,diff.cache_key,diff.status,diff.path,diff.summary,diff.facets,diff.contribution,diff.discrepancies,diff.confidence,diff.evidence_used])); }
  async getAiUsageForToday({projectId}) { const r=one(await this.pool.query(`SELECT COALESCE(SUM(COALESCE(input_tokens,0)+COALESCE(output_tokens,0)),0)::int tokens,COALESCE(SUM(COALESCE(estimated_cost,0)),0)::float cost FROM ai_requests WHERE project_id=$1 AND status='ok' AND created_at>=date_trunc('day',now())`,[projectId])); return {tokens:Number(r.tokens),cost:Number(r.cost)}; }
  async logAiRequest(data) { const d={...data,promptPreview:data.promptPreview?data.promptPreview.slice(0,200):null}; return one(await this.pool.query(`INSERT INTO ai_requests(project_id,purpose,provider,model,status,latency_ms,input_tokens,output_tokens,estimated_cost,error_code,prompt_preview) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[d.projectId||null,d.purpose,d.provider,d.model||null,d.status,d.latencyMs,d.inputTokens,d.outputTokens,d.estimatedCost,d.errorCode,d.promptPreview])); }
  async forkProject({ownerId,sourceVersionId,name,creativeGoal=null}) { const r=one(await this.pool.query('SELECT create_project_fork($1,$2,$3,$4) AS result',[sourceVersionId,ownerId,name,creativeGoal])); return r?.result; }

  async getUserProfile({ userId }) {
    const user = one(await this.pool.query('SELECT id, email, display_name, created_at FROM users WHERE id=$1', [userId]));
    if (!user) return null;
    const profile = one(await this.pool.query('SELECT display_name, username, bio, location, website, avatar_url, preferences, created_at, updated_at FROM profiles WHERE id=$1', [userId])) || {};
    return {
      id: user.id,
      email: user.email,
      display_name: profile.display_name || user.display_name || '',
      username: profile.username || String(user.email).split('@')[0],
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      avatar_url: profile.avatar_url || null,
      preferences: profile.preferences || {},
      created_at: user.created_at,
      updated_at: profile.updated_at || user.created_at
    };
  }

  async updateUserProfile({ userId, input = {} }) {
    const user = one(await this.pool.query('SELECT id, email, display_name FROM users WHERE id=$1', [userId]));
    if (!user) throw new ApiError('USER_NOT_FOUND', 'User not found.', { statusCode: 404 });
    const current = (await this.getUserProfile({ userId })) || {};

    const displayName = input.display_name !== undefined ? input.display_name : current.display_name;
    const username = input.username !== undefined ? input.username : current.username;
    const bio = input.bio !== undefined ? input.bio : current.bio;
    const location = input.location !== undefined ? input.location : current.location;
    const website = input.website !== undefined ? input.website : current.website;
    const avatarUrl = input.avatar_url !== undefined ? input.avatar_url : current.avatar_url;
    const preferences = input.preferences !== undefined ? { ...(current.preferences || {}), ...input.preferences } : (current.preferences || {});

    if (input.display_name !== undefined) {
      await this.pool.query('UPDATE users SET display_name=$1, updated_at=now() WHERE id=$2', [displayName, userId]);
    }

    await this.pool.query(
      `INSERT INTO profiles(id, display_name, username, bio, location, website, avatar_url, preferences, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())
       ON CONFLICT(id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         username = EXCLUDED.username,
         bio = EXCLUDED.bio,
         location = EXCLUDED.location,
         website = EXCLUDED.website,
         avatar_url = EXCLUDED.avatar_url,
         preferences = EXCLUDED.preferences,
         updated_at = now()`,
      [userId, displayName, username, bio, location, website, avatarUrl, JSON.stringify(preferences)]
    );

    return this.getUserProfile({ userId });
  }

  async getUserActivity({ userId, limit = 20 }) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const vRows = rows(await this.pool.query(
      `SELECT v.id, v.sequence, v.created_at, v.is_root, p.id AS project_id, p.name AS project_name
       FROM versions v
       JOIN projects p ON p.id = v.project_id
       WHERE p.owner_id = $1
       ORDER BY v.created_at DESC
       LIMIT $2`,
      [userId, lim]
    ));
    return vRows.map((v) => ({
      id: v.id,
      type: v.is_root ? 'asset_import' : 'version_create',
      action: v.is_root ? 'Imported project asset' : `Created creative version V${v.sequence}`,
      project_id: v.project_id,
      project_name: v.project_name,
      timestamp: v.created_at
    }));
  }

  // ── Phase 12: Notifications ────────────────────────────────────────────────
  async createNotification({ userId, type, title, message = null, entityType = null, entityId = null, metadata = {} }) {
    return one(await this.pool.query(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [userId, type, title, message, entityType, entityId, JSON.stringify(metadata)]
    ));
  }

  async listNotifications({ userId, limit = 50, unreadOnly = false }) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const q = unreadOnly
      ? ['SELECT * FROM notifications WHERE user_id=$1 AND read_at IS NULL ORDER BY created_at DESC LIMIT $2', [userId, lim]]
      : ['SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, lim]];
    return rows(await this.pool.query(...q));
  }

  async getUnreadNotificationCount({ userId }) {
    const res = one(await this.pool.query(
      'SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL',
      [userId]
    ));
    return res ? Number(res.count) : 0;
  }

  async markNotificationRead({ userId, notificationId }) {
    const row = one(await this.pool.query(
      `UPDATE notifications SET read_at=now()
       WHERE id=$1 AND user_id=$2 AND read_at IS NULL
       RETURNING *`,
      [notificationId, userId]
    ));
    if (!row) {
      // Check if it exists for this user (already read)
      const exists = one(await this.pool.query('SELECT * FROM notifications WHERE id=$1 AND user_id=$2', [notificationId, userId]));
      if (!exists) throw new ApiError('NOTIFICATION_NOT_FOUND', 'Notification not found.', { statusCode: 404 });
      return exists;
    }
    return row;
  }

  async markAllNotificationsRead({ userId }) {
    await this.pool.query(
      'UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL',
      [userId]
    );
    return { success: true };
  }

  // ── Phase 12: Saved Items ──────────────────────────────────────────────────
  async saveItem({ userId, entityType, entityId, metadata = {} }) {
    // Validate that the underlying entity belongs to/is accessible to the user
    if (entityType === 'project') {
      const p = one(await this.pool.query('SELECT id, name FROM projects WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL', [entityId, userId]));
      if (!p) throw new ApiError('PROJECT_NOT_FOUND', 'Cannot save project: not found or unauthorized.', { statusCode: 404 });
      metadata = { ...metadata, name: p.name };
    } else if (entityType === 'version') {
      const v = one(await this.pool.query('SELECT v.id, v.sequence, p.name as project_name, p.id as project_id FROM versions v JOIN projects p ON p.id=v.project_id WHERE v.id=$1 AND p.owner_id=$2', [entityId, userId]));
      if (!v) throw new ApiError('VERSION_NOT_FOUND', 'Cannot save version: not found or unauthorized.', { statusCode: 404 });
      metadata = { ...metadata, sequence: v.sequence, project_name: v.project_name, project_id: v.project_id };
    } else if (entityType === 'asset') {
      const a = one(await this.pool.query('SELECT a.id, a.mime, a.byte_size FROM assets a JOIN project_assets pa ON pa.asset_id=a.id JOIN projects p ON p.id=pa.project_id WHERE a.id=$1 AND p.owner_id=$2', [entityId, userId]));
      if (!a) throw new ApiError('ASSET_NOT_FOUND', 'Cannot save asset: not found or unauthorized.', { statusCode: 404 });
      metadata = { ...metadata, mime: a.mime, byte_size: a.byte_size };
    } else if (entityType === 'memory') {
      const m = one(await this.pool.query('SELECT id, statement, type FROM memories WHERE id=$1 AND created_by_user_id=$2', [entityId, userId]));
      if (!m) throw new ApiError('MEMORY_NOT_FOUND', 'Cannot save memory: not found or unauthorized.', { statusCode: 404 });
      metadata = { ...metadata, statement: m.statement, type: m.type };
    }

    const row = one(await this.pool.query(
      `INSERT INTO saved_items (user_id, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET metadata=EXCLUDED.metadata
       RETURNING *`,
      [userId, entityType, entityId, JSON.stringify(metadata)]
    ));
    return row;
  }

  async unsaveItem({ userId, savedItemId }) {
    const row = one(await this.pool.query(
      'DELETE FROM saved_items WHERE (id=$1 OR entity_id=$1) AND user_id=$2 RETURNING *',
      [savedItemId, userId]
    ));
    if (!row) throw new ApiError('SAVED_ITEM_NOT_FOUND', 'Saved item not found.', { statusCode: 404 });
    return row;
  }

  async listSavedItems({ userId, limit = 50, entityType = null }) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const q = entityType
      ? ['SELECT * FROM saved_items WHERE user_id=$1 AND entity_type=$2 ORDER BY created_at DESC LIMIT $3', [userId, entityType, lim]]
      : ['SELECT * FROM saved_items WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, lim]];
    return rows(await this.pool.query(...q));
  }

  // ── Phase 13: Settings ─────────────────────────────────────────────────────
  async getUserSettings({ userId }) {
    const user = one(await this.pool.query('SELECT id, email, display_name, created_at FROM users WHERE id=$1', [userId]));
    if (!user) throw new ApiError('USER_NOT_FOUND', 'User not found.', { statusCode: 404 });
    const profile = one(await this.pool.query('SELECT display_name, username, preferences FROM profiles WHERE id=$1', [userId])) || {};
    const prefs = profile.preferences || {};

    return {
      account: {
        id: user.id,
        email: user.email,
        display_name: profile.display_name || user.display_name || '',
        username: profile.username || String(user.email).split('@')[0],
        created_at: user.created_at,
        status: 'active'
      },
      appearance: prefs.appearance || {
        theme: 'dark',
        density: 'comfortable',
        reduced_motion: false
      },
      preferences: prefs.general || {
        default_landing: 'dashboard',
        default_asset_view: 'side-by-side',
        notifications_enabled: true,
        activity_stream_density: 'standard'
      },
      security: {
        session_type: 'jwt_bearer',
        session_ttl_seconds: config.auth.tokenTtlSeconds || 604800,
        two_factor_status: 'not_configured',
        password_set: true
      },
      ai: prefs.ai || {
        diff_detail_level: prefs.diff_detail_level || 'standard',
        copilot_groundedness: prefs.copilot_groundedness || 'strict',
        enable_ai_suggestions: true,
        active_providers: ['gemini', 'groq']
      },
      connected_services: [
        { id: 'mcp', name: 'Model Context Protocol (MCP)', status: 'ready', version: '0.1.0' },
        { id: 'ai_engine', name: 'Canopy AI Intelligence (Gemini + Groq)', status: 'configured', type: 'internal' }
      ]
    };
  }

  async updateUserSettings({ userId, input = {} }) {
    const current = (await this.getUserSettings({ userId })) || {};
    const profile = one(await this.pool.query('SELECT preferences FROM profiles WHERE id=$1', [userId])) || {};
    const currentPrefs = profile.preferences || {};

    const updatedPrefs = {
      ...currentPrefs,
      ...(input.appearance ? { appearance: { ...(currentPrefs.appearance || {}), ...input.appearance } } : {}),
      ...(input.preferences ? { general: { ...(currentPrefs.general || {}), ...input.preferences } } : {}),
      ...(input.ai ? { ai: { ...(currentPrefs.ai || {}), ...input.ai } } : {})
    };

    await this.pool.query(
      `INSERT INTO profiles(id, preferences, updated_at)
       VALUES($1, $2::jsonb, now())
       ON CONFLICT(id) DO UPDATE SET
         preferences = EXCLUDED.preferences,
         updated_at = now()`,
      [userId, JSON.stringify(updatedPrefs)]
    );

    return this.getUserSettings({ userId });
  }

  async getUserSecurityStatus({ userId }) {
    const user = one(await this.pool.query('SELECT id, email, display_name, created_at FROM users WHERE id=$1', [userId]));
    if (!user) return null;

    const tokenStats = one(await this.pool.query(
      'SELECT count(*) FILTER (WHERE revoked_at IS NULL) as active_tokens, count(*) as total_tokens FROM api_tokens WHERE user_id=$1',
      [userId]
    ));

    const activityRows = (await this.pool.query(
      `SELECT id, type, title, message, created_at
       FROM notifications
       WHERE user_id=$1 AND type IN ('developer_activity', 'ai_activity')
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    )).rows;

    return {
      account: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        username: user.email.split('@')[0],
        auth_method: 'canopy_jwt_bearer',
        created_at: user.created_at
      },
      session: {
        status: 'active',
        auth_method: 'jwt_bearer',
        ttl_seconds: config.auth.tokenTtlSeconds || 604800,
        multi_session_revocation: false,
        notice: 'Current session is authenticated via signed cryptographic JWT bearer token.'
      },
      api_tokens: {
        active_count: parseInt(tokenStats?.active_tokens || '0', 10),
        total_count: parseInt(tokenStats?.total_tokens || '0', 10)
      },
      two_factor: {
        status: 'not_configured',
        configured: false,
        supported_methods: [],
        notice: 'Two-Factor Authentication (TOTP / WebAuthn) is not configured in this prototype deployment.'
      },
      oauth: {
        status: 'not_configured',
        providers: [],
        notice: 'External OAuth providers (Google, GitHub, Figma) are not configured for this prototype.'
      },
      password: {
        status: 'bcrypt_hashed',
        configured: true,
        notice: 'Primary password credentials are salted and hashed with bcrypt in PostgreSQL.'
      },
      recent_activity: activityRows
    };
  }
}


function detectImageMime(bytes) { if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return 'image/png'; if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg'; if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp'; return null; }
