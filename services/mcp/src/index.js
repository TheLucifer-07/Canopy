/**
 * Canopy Model Context Protocol (MCP) Server
 * Architectural boundary established per Blueprint §21.
 * 
 * Note: MCP is an interface into Canopy, not Canopy intelligence itself.
 * All operations will consume the Canopy REST API (/v1) through @canopy/api-client.
 * Tool implementations will be introduced in subsequent implementation phases.
 */

import { PLATFORM_NAME, PLATFORM_VERSION } from '@canopy/config';

console.log(`${PLATFORM_NAME} MCP Server boundary initialized (v${PLATFORM_VERSION}).`);
console.log('Status: Service boundary established. Tools pending subsequent implementation phase.');
