import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import { config } from './lib/config.js';
import { healthRoutes } from './routes/health.js';
import { v1Routes } from './routes/v1.js';
import { LIMITS } from '@canopy/config';
import { createRepositories } from './repositories/index.js';
import { authenticateRequest } from './lib/auth.js';
import { sendApiError } from './lib/errors.js';
import { createProviderRegistry } from './providers/index.js';

export async function buildServer(options = {}) {
  const fastify = Fastify({
    logger: options.logger ?? {
      level: config.env === 'test' ? 'silent' : 'info'
    }
  });

  fastify.decorate('repositories', createRepositories(options.repositories || {}));
  fastify.decorate('providerRegistry', options.providerRegistry || createProviderRegistry(options.providerOptions || {}));
  fastify.decorate('authenticate', options.authenticate || authenticateRequest);

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error({
      code: error.code,
      route: request.routeOptions?.url,
      method: request.method
    }, error.message);
    return sendApiError(reply, error, request.id);
  });

  // Security & utility plugins
  await fastify.register(sensible);
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        config.env === 'development' ||
        config.corsOrigin === '*' ||
        config.corsOrigin === 'true' ||
        origin === config.corsOrigin ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  });

  // Multipart support for asset uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: LIMITS.MAX_UPLOAD_SIZE_BYTES
    }
  });

  // Health and root endpoints
  await fastify.register(healthRoutes);

  // Versioned API routes
  await fastify.register(v1Routes, { prefix: '/v1' });

  return fastify;
}
