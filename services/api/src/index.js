import { buildServer } from './server.js';
import { config } from './lib/config.js';

async function start() {
  const server = await buildServer();

  try {
    const address = await server.listen({
      port: config.port,
      host: config.host
    });
    server.log.info(`Canopy API service running at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
