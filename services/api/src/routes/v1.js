import {
  AssetParamsSchema,
  ApiTokenCreateSchema,
  ApiTokenParamsSchema,
  CommitVersionSchema,
  CopilotConversationParamsSchema,
  CopilotMessageSchema,
  CreateMemorySchema,
  CreateProjectSchema,
  DiffRequestSchema,
  ForkProjectSchema,
  HistorySearchQuerySchema,
  ImportVersionSchema,
  MemoryParamsSchema,
  MemoryQuerySchema,
  MergeVersionsSchema,
  PaginationQuerySchema,
  ProjectParamsSchema,
  NotificationParamsSchema,
  SavedItemCreateSchema,
  SavedItemParamsSchema,
  UpdateProjectSchema,
  UpdateMemorySchema,
  UserProfileUpdateSchema,
  UserSettingsUpdateSchema,
  VersionParamsSchema
} from '@canopy/schemas';
import { CoreOperations } from '../operations/core.js';
import { parseWithSchema } from '../lib/validation.js';
import { ApiError } from '../lib/errors.js';
import { ERROR_CODES, LIMITS } from '@canopy/config';
import { CopilotService } from '../intelligence/copilot.js';
import { generateApiToken, hashApiToken, hashPassword, issueAccessToken, verifyPassword } from '../lib/auth.js';
import { config } from '../lib/config.js';

const copilotRate = new Map();

async function auth(request, fastify, scope = null) {
  return fastify.authenticate(request, scope);
}

export async function v1Routes(fastify) {
  const core = new CoreOperations({
    repository: fastify.repositories.core,
    providerRegistry: fastify.providerRegistry
  });
  const copilot = new CopilotService({
    repository: fastify.repositories.core,
    providerRegistry: fastify.providerRegistry,
    semanticDiff: core.semanticDiff
  });

  fastify.get('/health', async () => ({
    status: 'ok',
    api_version: 'v1'
  }));

  fastify.post('/auth/register', async (request, reply) => {
    const { email, password, display_name: displayName = null } = request.body || {};
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'A valid email and password of at least 8 characters are required.', { statusCode: 422 });
    }
    try {
      const result = await fastify.repositories.core.pool.query('INSERT INTO users(email,password_hash,display_name) VALUES(lower($1),$2,$3) RETURNING id,email,display_name', [email, hashPassword(password), displayName]);
      return reply.status(201).send({ user: result.rows[0], access_token: issueAccessToken(result.rows[0]) });
    } catch (err) {
      if (err?.code === '23505') {
        throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'An account with this email already exists.', { statusCode: 409 });
      }
      throw err;
    }
  });

  fastify.post('/auth/login', async (request) => {
    const { email, password } = request.body || {};
    const user = (await fastify.repositories.core.pool.query('SELECT id,email,display_name,password_hash FROM users WHERE email=lower($1)', [email])).rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid email or password.', { statusCode: 401 });
    const { password_hash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, access_token: issueAccessToken(safeUser) };
  });

  fastify.get('/me/tokens', async (request) => {
    const authContext = await auth(request, fastify);
    const rows = await fastify.repositories.core.pool.query(
      'SELECT id,name,token_prefix,scopes,revoked_at,last_used_at,created_at FROM api_tokens WHERE user_id=$1 ORDER BY created_at DESC',
      [authContext.userId]
    );
    return { data: rows.rows };
  });

  fastify.post('/me/tokens', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const body = parseWithSchema(ApiTokenCreateSchema, request.body);
    const token = generateApiToken();
    const row = (await fastify.repositories.core.pool.query(
      `INSERT INTO api_tokens(user_id,name,token_hash,token_prefix,scopes)
       VALUES($1,$2,$3,$4,$5) RETURNING id,name,token_prefix,scopes,created_at`,
      [authContext.userId, body.name, hashApiToken(token), token.slice(0, 16), body.scopes]
    )).rows[0];
    return reply.status(201).send({ ...row, token });
  });

  fastify.delete('/me/tokens/:tokenId', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ApiTokenParamsSchema, request.params);
    const row = (await fastify.repositories.core.pool.query(
      `UPDATE api_tokens SET revoked_at=now()
       WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL
       RETURNING id,name,token_prefix,scopes,revoked_at`,
      [params.tokenId, authContext.userId]
    )).rows[0];
    if (!row) throw new ApiError('TOKEN_NOT_FOUND', 'Token not found.', { statusCode: 404 });
    return row;
  });

  // ── Phase 11: Profile & Activity ─────────────────────────────────────────────
  fastify.get('/me/profile', async (request) => {
    const authContext = await auth(request, fastify);
    const profile = await fastify.repositories.core.getUserProfile({ userId: authContext.userId });
    if (!profile) throw new ApiError('USER_NOT_FOUND', 'Profile not found.', { statusCode: 404 });
    return profile;
  });

  fastify.patch('/me/profile', async (request) => {
    const authContext = await auth(request, fastify);
    const body = parseWithSchema(UserProfileUpdateSchema, request.body);
    return fastify.repositories.core.updateUserProfile({ userId: authContext.userId, input: body });
  });

  fastify.get('/me/activity', async (request) => {
    const authContext = await auth(request, fastify);
    const limit = parseInt(request.query?.limit, 10) || 20;
    const activity = await fastify.repositories.core.getUserActivity({ userId: authContext.userId, limit });
    return { data: activity };
  });

  // ── Phase 12: Notifications ──────────────────────────────────────────────────
  fastify.get('/me/notifications', async (request) => {
    const authContext = await auth(request, fastify);
    const limit = parseInt(request.query?.limit, 10) || 50;
    const unreadOnly = request.query?.unread === 'true';
    const notifications = await fastify.repositories.core.listNotifications({
      userId: authContext.userId,
      limit,
      unreadOnly
    });
    return { data: notifications };
  });

  fastify.get('/me/notifications/unread-count', async (request) => {
    const authContext = await auth(request, fastify);
    const count = await fastify.repositories.core.getUnreadNotificationCount({ userId: authContext.userId });
    return { unread_count: count };
  });

  fastify.patch('/me/notifications/:notificationId/read', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(NotificationParamsSchema, request.params);
    return fastify.repositories.core.markNotificationRead({
      userId: authContext.userId,
      notificationId: params.notificationId
    });
  });

  fastify.post('/me/notifications/mark-all-read', async (request) => {
    const authContext = await auth(request, fastify);
    return fastify.repositories.core.markAllNotificationsRead({ userId: authContext.userId });
  });

  // ── Phase 12: Saved Items ────────────────────────────────────────────────────
  fastify.get('/me/saved-items', async (request) => {
    const authContext = await auth(request, fastify);
    const limit = parseInt(request.query?.limit, 10) || 50;
    const entityType = request.query?.entity_type || null;
    const items = await fastify.repositories.core.listSavedItems({
      userId: authContext.userId,
      limit,
      entityType
    });
    return { data: items };
  });

  fastify.post('/me/saved-items', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const body = parseWithSchema(SavedItemCreateSchema, request.body);
    const item = await fastify.repositories.core.saveItem({
      userId: authContext.userId,
      entityType: body.entity_type,
      entityId: body.entity_id,
      metadata: body.metadata
    });
    return reply.status(201).send(item);
  });

  fastify.delete('/me/saved-items/:savedItemId', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(SavedItemParamsSchema, request.params);
    return fastify.repositories.core.unsaveItem({
      userId: authContext.userId,
      savedItemId: params.savedItemId
    });
  });

  // ── Phase 13: Settings ───────────────────────────────────────────────────────
  fastify.get('/me/settings', async (request) => {
    const authContext = await auth(request, fastify);
    return fastify.repositories.core.getUserSettings({ userId: authContext.userId });
  });

  fastify.patch('/me/settings', async (request) => {
    const authContext = await auth(request, fastify);
    const body = parseWithSchema(UserSettingsUpdateSchema, request.body);
    return fastify.repositories.core.updateUserSettings({ userId: authContext.userId, input: body });
  });

  // ── Phase 14: Security ───────────────────────────────────────────────────────
  fastify.get('/me/security', async (request) => {
    const authContext = await auth(request, fastify);
    const status = await fastify.repositories.core.getUserSecurityStatus({ userId: authContext.userId });
    return { data: status };
  });

  fastify.post('/projects', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const body = parseWithSchema(CreateProjectSchema, request.body);
    const project = await core.createProject(authContext, body);
    return reply.status(201).send(project);
  });

  fastify.get('/projects', async (request) => {
    const authContext = await auth(request, fastify, 'projects:read');
    const query = parseWithSchema(PaginationQuerySchema, request.query);
    const projects = await core.listProjects(authContext, query);
    const next = projects.length === query.limit ? projects.at(-1)?.created_at : null;
    return { data: projects, next_cursor: next };
  });

  fastify.get('/projects/:projectId', async (request) => {
    const authContext = await auth(request, fastify, 'projects:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    return core.getProject(authContext, params.projectId);
  });

  fastify.patch('/projects/:projectId', async (request) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(UpdateProjectSchema, request.body);
    return core.updateProject(authContext, params.projectId, body);
  });

  fastify.delete('/projects/:projectId', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    await core.archiveProject(authContext, params.projectId);
    return reply.status(204).send();
  });

  fastify.post('/projects/:projectId/fork', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(ForkProjectSchema, request.body);
    const fork = await core.forkProject(authContext, { ...body, source_project_id: params.projectId });
    return reply.status(201).send(fork);
  });

  fastify.post('/projects/:projectId/assets', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const part = await request.file();
    if (!part) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'An image file is required.', { statusCode: 422 });
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(part.mimetype)) {
      throw new ApiError('ASSET_UNSUPPORTED_TYPE', 'Only PNG, JPEG, and WebP images are supported.', { statusCode: 415 });
    }
    const bytes = await part.toBuffer();
    if (bytes.length > LIMITS.MAX_UPLOAD_SIZE_BYTES) {
      throw new ApiError('ASSET_TOO_LARGE', 'Asset exceeds the maximum upload size.', { statusCode: 413 });
    }
    const asset = await core.uploadAsset(authContext, {
      projectId: params.projectId,
      bytes,
      mime: part.mimetype
    });
    return reply.status(201).send(asset);
  });

  fastify.get('/projects/:projectId/assets', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const assets = await core.getProjectAssets(authContext, params.projectId);
    return { project_id: params.projectId, assets };
  });

  fastify.get('/assets/:assetId', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(AssetParamsSchema, request.params);
    return core.getAssetDetail(authContext, params.assetId);
  });

  fastify.get('/assets/:assetId/url', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(AssetParamsSchema, request.params);
    return core.getAssetUrl(authContext, params.assetId);
  });

  fastify.get('/assets/:assetId/content', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(AssetParamsSchema, request.params);
    const file = await fastify.repositories.core.downloadAssetBytes({ ownerId: authContext.userId, assetId: params.assetId });
    return reply.type(file.mime).send(file.bytes);
  });

  fastify.get('/versions/:versionId', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(VersionParamsSchema, request.params);
    return core.getVersionDetail(authContext, params.versionId);
  });

  fastify.post('/projects/:projectId/versions/import', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(ImportVersionSchema, request.body);
    const version = await core.createRootVersion(authContext, params.projectId, body, {
      idempotencyKey: request.headers['idempotency-key']
    });
    void copilot.indexVersion({ ownerId: authContext.userId, version }).catch(() => {});
    return reply.status(201).send(version);
  });

  fastify.post('/projects/:projectId/versions', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CommitVersionSchema, request.body);
    const version = await core.commitVersion(authContext, params.projectId, body, {
      idempotencyKey: request.headers['idempotency-key']
    });
    void copilot.indexVersion({ ownerId: authContext.userId, version }).catch(() => {});
    return reply.status(201).send(version);
  });

  fastify.post('/projects/:projectId/merge', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(MergeVersionsSchema, request.body);
    const version = await core.mergeVersions(authContext, params.projectId, body, {
      idempotencyKey: request.headers['idempotency-key']
    });
    void copilot.indexVersion({ ownerId: authContext.userId, version }).catch(() => {});
    return reply.status(201).send(version);
  });

  fastify.post('/versions/:versionId/continue', async (request) => {
    const authContext = await auth(request, fastify, 'versions:write');
    const params = parseWithSchema(VersionParamsSchema, request.params);
    return core.continueFrom(authContext, params.versionId);
  });

  // New: List versions for a project
  fastify.get('/projects/:projectId/versions', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    return fastify.repositories.core.getProjectVersions({ projectId: params.projectId, ownerId: authContext.userId });
  });

  fastify.get('/projects/:projectId/lineage', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    return core.getLineage(authContext, params.projectId);
  });

  fastify.post('/projects/:projectId/memories', async (request, reply) => {
    const authContext = await auth(request, fastify, 'memory:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CreateMemorySchema, request.body);
    const memory = await core.createMemory(authContext, params.projectId, body);
    void copilot.indexMemory({ ownerId: authContext.userId, memory }).catch(() => {});
    return reply.status(201).send(memory);
  });

  fastify.post('/projects/:projectId/memories/propose', async (request, reply) => {
    const authContext = await auth(request, fastify, 'memory:write');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CreateMemorySchema, request.body);
    const memory = await core.proposeMemory(authContext, params.projectId, body);
    void copilot.indexMemory({ ownerId: authContext.userId, memory }).catch(() => {});
    return reply.status(201).send(memory);
  });

  fastify.get('/projects/:projectId/memories', async (request) => {
    const authContext = await auth(request, fastify, 'memory:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const query = parseWithSchema(MemoryQuerySchema, request.query);
    return { data: await core.listMemories(authContext, params.projectId, query) };
  });

  fastify.get('/projects/:projectId/history/search', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const query = parseWithSchema(HistorySearchQuerySchema, request.query);
    await core.getProject(authContext, params.projectId);
    const [versions, memories] = await Promise.all([
      fastify.repositories.core.searchCopilotVersions({ projectId: params.projectId, ownerId: authContext.userId, query: query.query, limit: query.limit }),
      fastify.repositories.core.searchCopilotMemories({ projectId: params.projectId, ownerId: authContext.userId, query: query.query, limit: query.limit })
    ]);
    return { data: { versions, memories } };
  });

  fastify.get('/memories/:memoryId', async (request) => {
    const authContext = await auth(request, fastify, 'memory:read');
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    return core.getMemory(authContext, params.memoryId);
  });

  fastify.patch('/memories/:memoryId', async (request, reply) => {
    const authContext = await auth(request, fastify, 'memory:write');
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    const body = parseWithSchema(UpdateMemorySchema, request.body);
    const memory = await core.editMemory(authContext, params.memoryId, body);
    void copilot.indexMemory({ ownerId: authContext.userId, memory }).catch(() => {});
    return reply.status(200).send(memory);
  });

  fastify.post('/memories/:memoryId/confirm', async (request) => {
    const authContext = await auth(request, fastify, 'memory:write');
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    return core.confirmMemory(authContext, params.memoryId);
  });

  fastify.post('/memories/:memoryId/archive', async (request) => {
    const authContext = await auth(request, fastify, 'memory:write');
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    return core.archiveMemory(authContext, params.memoryId);
  });

  fastify.post('/diffs', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const body = parseWithSchema(DiffRequestSchema, request.body);
    const diff = await core.createSemanticDiff(authContext, body);
    return reply.status(201).send(diff);
  });

  fastify.post('/projects/:projectId/copilot/messages', async (request, reply) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CopilotMessageSchema, request.body);
    enforceCopilotRateLimit(authContext.userId);
    const repository = fastify.repositories.core;
    const conversation = body.conversation_id
      ? await repository.getCopilotConversation({ conversationId: body.conversation_id, ownerId: authContext.userId })
      : await repository.createCopilotConversation({ projectId: params.projectId, ownerId: authContext.userId, title: body.question.slice(0, 120) });
    if (!conversation) throw new ApiError('COPILOT_CONVERSATION_NOT_FOUND', 'Conversation not found.', { statusCode: 404 });
    const conversationId = conversation.id;
    await repository.addCopilotMessage({ conversationId, ownerId: authContext.userId, role: 'user', content: body.question });
    const origin = request.headers.origin || config.corsOrigin;
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Idempotency-Key',
      Vary: 'Origin'
    });
    const abortController = new AbortController();
    let closed = false;
    let streamedText = '';
    // `close` fires when Fastify finishes consuming the request body. Only
    // abort provider work when the client actually aborts the request.
    request.raw.on('aborted', () => { closed = true; abortController.abort(); });
    const send = (event, data) => {
      if (!closed) reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      const result = await copilot.streamAnswer({
        ownerId: authContext.userId,
        projectId: params.projectId,
        question: body.question,
        conversationId,
        signal: abortController.signal,
        onEvent: ({ event, data }) => send(event, data),
        onToken: async (text) => {
          streamedText += text;
          send('token', { text });
        }
      });
      send('citations', { citations: result.citations, grounded: result.grounded });
      await repository.addCopilotMessage({
        conversationId, ownerId: authContext.userId, role: 'assistant', content: result.text,
        citations: result.citations, toolsUsed: result.tools_used, grounded: result.grounded
      });
      send('done', { conversation_id: conversationId, grounded: result.grounded, tools_used: result.tools_used });
    } catch (error) {
      request.log.warn({ code: error.code || 'COPILOT_FAILED', name: error.name, message: error.message }, 'Copilot stream failed.');
      if (streamedText) {
        await repository.addCopilotMessage({
          conversationId, ownerId: authContext.userId, role: 'assistant', content: streamedText,
          citations: [], toolsUsed: [], grounded: false
        }).catch(() => {});
      }
      send('error', { code: error.code || 'COPILOT_FAILED', message: error.code === 'AI_PROVIDER_UNAVAILABLE' ? 'Copilot provider is unavailable.' : 'Copilot could not answer from project history.' });
    } finally {
      if (!closed) reply.raw.end();
    }
  });

  fastify.get('/projects/:projectId/copilot/conversations', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    return { data: await fastify.repositories.core.listCopilotConversations({ projectId: params.projectId, ownerId: authContext.userId }) };
  });

  fastify.get('/copilot/conversations/:conversationId', async (request) => {
    const authContext = await auth(request, fastify, 'versions:read');
    const params = parseWithSchema(CopilotConversationParamsSchema, request.params);
    const conversation = await fastify.repositories.core.getCopilotConversation({ conversationId: params.conversationId, ownerId: authContext.userId });
    if (!conversation) throw new ApiError('COPILOT_CONVERSATION_NOT_FOUND', 'Conversation not found.', { statusCode: 404 });
    return conversation;
  });
}

function enforceCopilotRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (copilotRate.get(userId) || []).filter((timestamp) => timestamp > windowStart);
  if (timestamps.length >= 20) throw new ApiError('COPILOT_RATE_LIMITED', 'Copilot rate limit exceeded.', { statusCode: 429, retryable: true });
  timestamps.push(now);
  copilotRate.set(userId, timestamps);
}
