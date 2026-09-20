import {
  AssetParamsSchema,
  CommitVersionSchema,
  CreateMemorySchema,
  CreateProjectSchema,
  DiffRequestSchema,
  ForkProjectSchema,
  ImportVersionSchema,
  MemoryParamsSchema,
  MemoryQuerySchema,
  MergeVersionsSchema,
  PaginationQuerySchema,
  ProjectParamsSchema,
  UpdateMemorySchema,
  VersionParamsSchema
} from '@canopy/schemas';
import { CoreOperations } from '../operations/core.js';
import { parseWithSchema } from '../lib/validation.js';
import { ApiError } from '../lib/errors.js';
import { ERROR_CODES, LIMITS } from '@canopy/config';

async function auth(request, fastify) {
  return fastify.authenticate(request);
}

export async function v1Routes(fastify) {
  const core = new CoreOperations({
    repository: fastify.repositories.core,
    providerRegistry: fastify.providerRegistry
  });

  fastify.get('/health', async () => ({
    status: 'ok',
    api_version: 'v1'
  }));

  fastify.post('/projects', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const body = parseWithSchema(CreateProjectSchema, request.body);
    const project = await core.createProject(authContext, body);
    return reply.status(201).send(project);
  });

  fastify.get('/projects', async (request) => {
    const authContext = await auth(request, fastify);
    const query = parseWithSchema(PaginationQuerySchema, request.query);
    const projects = await core.listProjects(authContext, query);
    const next = projects.length === query.limit ? projects.at(-1)?.created_at : null;
    return { data: projects, next_cursor: next };
  });

  fastify.get('/projects/:projectId', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    return core.getProject(authContext, params.projectId);
  });

  fastify.post('/projects/:projectId/fork', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(ForkProjectSchema, request.body);
    const fork = await core.forkProject(authContext, { ...body, source_project_id: params.projectId });
    return reply.status(201).send(fork);
  });

  fastify.post('/projects/:projectId/assets', async (request, reply) => {
    const authContext = await auth(request, fastify);
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

  fastify.get('/assets/:assetId/url', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(AssetParamsSchema, request.params);
    return core.getAssetUrl(authContext, params.assetId);
  });

  fastify.get('/versions/:versionId', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(VersionParamsSchema, request.params);
    return core.getVersionDetail(authContext, params.versionId);
  });

  fastify.post('/projects/:projectId/versions/import', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(ImportVersionSchema, request.body);
    const version = await core.createRootVersion(authContext, params.projectId, body, {
      idempotencyKey: request.headers['idempotency-key']
    });
    return reply.status(201).send(version);
  });

  fastify.post('/projects/:projectId/versions', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CommitVersionSchema, request.body);
    const version = await core.commitVersion(authContext, params.projectId, body, {
      idempotencyKey: request.headers['idempotency-key']
    });
    return reply.status(201).send(version);
  });

  fastify.post('/projects/:projectId/merge', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(MergeVersionsSchema, request.body);
    const version = await core.mergeVersions(authContext, params.projectId, body, {
      idempotencyKey: request.headers['idempotency-key']
    });
    return reply.status(201).send(version);
  });

  fastify.post('/versions/:versionId/continue', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(VersionParamsSchema, request.params);
    return core.continueFrom(authContext, params.versionId);
  });

  fastify.get('/projects/:projectId/lineage', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    return core.getLineage(authContext, params.projectId);
  });

  fastify.post('/projects/:projectId/memories', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CreateMemorySchema, request.body);
    const memory = await core.createMemory(authContext, params.projectId, body);
    return reply.status(201).send(memory);
  });

  fastify.post('/projects/:projectId/memories/propose', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const body = parseWithSchema(CreateMemorySchema, request.body);
    const memory = await core.proposeMemory(authContext, params.projectId, body);
    return reply.status(201).send(memory);
  });

  fastify.get('/projects/:projectId/memories', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(ProjectParamsSchema, request.params);
    const query = parseWithSchema(MemoryQuerySchema, request.query);
    return { data: await core.listMemories(authContext, params.projectId, query) };
  });

  fastify.patch('/memories/:memoryId', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    const body = parseWithSchema(UpdateMemorySchema, request.body);
    const memory = await core.editMemory(authContext, params.memoryId, body);
    return reply.status(200).send(memory);
  });

  fastify.post('/memories/:memoryId/confirm', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    return core.confirmMemory(authContext, params.memoryId);
  });

  fastify.post('/memories/:memoryId/archive', async (request) => {
    const authContext = await auth(request, fastify);
    const params = parseWithSchema(MemoryParamsSchema, request.params);
    return core.archiveMemory(authContext, params.memoryId);
  });

  fastify.post('/diffs', async (request, reply) => {
    const authContext = await auth(request, fastify);
    const body = parseWithSchema(DiffRequestSchema, request.body);
    const diff = await core.createSemanticDiff(authContext, body);
    return reply.status(201).send(diff);
  });
}
