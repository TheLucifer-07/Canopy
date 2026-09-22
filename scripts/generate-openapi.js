import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLATFORM_NAME, PLATFORM_VERSION } from '@canopy/config';

export function generateOpenApiSpec() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: `${PLATFORM_NAME} Core REST API`,
      version: PLATFORM_VERSION,
      description: 'Authoritative REST API for versioning, understanding, and preserving human + AI creative work.'
    },
    servers: [
      { url: 'http://localhost:3000/v1', description: 'Local Development Server' }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health Check',
          responses: {
            '200': { description: 'API health status' }
          }
        }
      },
      '/auth/register': {
        post: {
          summary: 'Register User Account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    display_name: { type: 'string', nullable: true }
                  },
                  required: ['email', 'password']
                }
              }
            }
          },
          responses: { '201': { description: 'Registered user and access token' } }
        }
      },
      '/auth/login': {
        post: {
          summary: 'User Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                  },
                  required: ['email', 'password']
                }
              }
            }
          },
          responses: { '200': { description: 'User object and access token' } }
        }
      },
      '/me/tokens': {
        get: {
          summary: 'List Machine API Tokens',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'List of tokens for the authenticated user' } }
        },
        post: {
          summary: 'Create Machine API Token',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Created machine API token' } }
        }
      },
      '/projects': {
        get: {
          summary: 'List Projects',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Paginated list of user projects' } }
        },
        post: {
          summary: 'Create Project',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Created project' } }
        }
      },
      '/projects/{projectId}': {
        get: {
          summary: 'Get Project Details',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Project details' } }
        }
      },
      '/projects/{projectId}/assets': {
        post: {
          summary: 'Upload Creative Asset',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Uploaded asset details' } }
        }
      },
      '/projects/{projectId}/versions/import': {
        post: {
          summary: 'Import Root Version',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Created root version' } }
        }
      },
      '/projects/{projectId}/versions': {
        post: {
          summary: 'Commit Version',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Created version' } }
        }
      },
      '/projects/{projectId}/lineage': {
        get: {
          summary: 'Get Lineage DAG',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Lineage versions and parent edges' } }
        }
      },
      '/projects/{projectId}/fork': {
        post: {
          summary: 'Fork Project',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Forked project' } }
        }
      },
      '/projects/{projectId}/merge': {
        post: {
          summary: 'Merge Versions',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Merged version' } }
        }
      },
      '/projects/{projectId}/memories': {
        get: {
          summary: 'List Creative Memories',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'List of project memories' } }
        },
        post: {
          summary: 'Create Creative Memory',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Created memory' } }
        }
      },
      '/diffs': {
        post: {
          summary: 'Create Semantic Diff',
          security: [{ BearerAuth: [] }],
          responses: { '201': { description: 'Reconciled three-source semantic diff' } }
        }
      },
      '/projects/{projectId}/copilot/messages': {
        post: {
          summary: 'Stream Copilot Answer',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'SSE stream of grounded answer with citations' } }
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT or PAT (cnp_pat_...)'
        }
      }
    }
  };

  const outputPath = join(process.cwd(), 'docs/api/openapi.json');
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf8');
  console.log(`✓ Generated OpenAPI specification at ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateOpenApiSpec();
}
