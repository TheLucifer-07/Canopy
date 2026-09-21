import { buildServer } from '../services/api/src/server.js';

async function testApi() {
  console.log('Testing Fastify API initialization...');
  const server = await buildServer({ logger: false });

  try {
    // Inject request to /health
    const healthRes = await server.inject({
      method: 'GET',
      url: '/health'
    });
    console.log('GET /health response:', healthRes.statusCode, healthRes.payload);
    if (healthRes.statusCode !== 200) {
      throw new Error(`Expected 200, got ${healthRes.statusCode}`);
    }

    // Inject request to /v1/health
    const v1HealthRes = await server.inject({
      method: 'GET',
      url: '/v1/health'
    });
    console.log('GET /v1/health response:', v1HealthRes.statusCode, v1HealthRes.payload);
    if (v1HealthRes.statusCode !== 200) {
      throw new Error(`Expected 200, got ${v1HealthRes.statusCode}`);
    }

    // Project routes require a valid Canopy API access token.
    const projectsRes = await server.inject({
      method: 'GET',
      url: '/v1/projects'
    });
    console.log('GET /v1/projects response:', projectsRes.statusCode, projectsRes.payload);
    if (projectsRes.statusCode !== 401) {
      throw new Error(`Expected unauthenticated 401, got ${projectsRes.statusCode}`);
    }

    console.log('✓ Fastify API service successfully verified!');
  } finally {
    await server.close();
  }
}

testApi().catch(err => {
  console.error('API Verification failed:', err);
  process.exit(1);
});
