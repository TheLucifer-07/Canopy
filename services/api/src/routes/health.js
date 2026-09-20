import { PLATFORM_NAME, PLATFORM_VERSION } from '@canopy/config';

export async function healthRoutes(fastify) {
  fastify.get('/health', async () => ({
    status: 'healthy',
    platform: PLATFORM_NAME,
    version: PLATFORM_VERSION,
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime()
  }));
}
