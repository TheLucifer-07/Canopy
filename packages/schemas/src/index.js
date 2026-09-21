/**
 * @canopy/schemas
 * Shared Zod validation schemas — single source of truth for request/response shapes.
 * Consumed by both API (server) and Web (client-side validation).
 *
 * Phase 1: Project, Asset, Version, Action, Memory, and Lineage request shapes.
 */

import { z } from 'zod';
import {
  ACTOR_TYPES,
  CAPTURE_FIDELITY,
  LIMITS,
  MEMORY_STATUS,
  MEMORY_TYPES
} from '@canopy/config';

// ── Primitives ────────────────────────────────────────────────────────────────
export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z.string().datetime();

// ── Health ────────────────────────────────────────────────────────────────────
export const HealthResponseSchema = z.object({
  status: z.literal('healthy'),
  platform: z.string(),
  version: z.string(),
  timestamp: IsoDateSchema,
  uptime_seconds: z.number().nonnegative()
});

// ── API Error (Blueprint §27.2) ───────────────────────────────────────────────
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    retryable: z.boolean().default(false),
    request_id: z.string().optional()
  })
});

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional()
});

export const ProjectSchema = z.object({
  id: UuidSchema,
  owner_id: UuidSchema,
  name: z.string(),
  creative_goal: z.string().nullable().optional(),
  version_sequence_counter: z.number().int().optional(),
  archived_at: IsoDateSchema.nullable().optional(),
  created_at: IsoDateSchema,
  updated_at: IsoDateSchema
});

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.MAX_PROJECT_NAME_LENGTH),
  creative_goal: z.string().trim().max(LIMITS.MAX_CREATIVE_GOAL_LENGTH).optional().nullable()
});

export const ProjectParamsSchema = z.object({
  projectId: UuidSchema
});

export const HistorySearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(50).default(8)
});

export const VersionParamsSchema = z.object({
  versionId: UuidSchema
});

export const AssetParamsSchema = z.object({
  assetId: UuidSchema
});

export const AssetSchema = z.object({
  id: UuidSchema,
  content_hash: z.string(),
  media_type: z.string(),
  mime: z.string(),
  storage_key: z.string(),
  thumb_storage_key: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  byte_size: z.number().int().nonnegative(),
  created_at: IsoDateSchema
});

export const ImportVersionSchema = z.object({
  asset_id: UuidSchema,
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional()
});

export const OperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('adjust'),
    params: z.object({
      brightness: z.number().min(-100).max(100).optional()
    }).refine((params) => Object.keys(params).length > 0, 'At least one adjustment parameter is required.')
  }),
  z.object({
    type: z.literal('crop'),
    params: z.object({
      aspect: z.enum(['1:1', '4:5', '16:9', 'free'])
    })
  }),
  z.object({
    type: z.literal('rotate'),
    params: z.object({
      degrees: z.number().refine((value) => [90, 180, 270].includes(value), 'Rotation must be 90, 180, or 270 degrees.')
    })
  }),
  z.object({
    type: z.literal('flip'),
    params: z.object({
      axis: z.enum(['horizontal', 'vertical'])
    })
  }),
  z.object({
    type: z.literal('text'),
    params: z.object({
      value: z.string().trim().min(1).max(80)
    })
  })
]);

export const CommitVersionSchema = z.object({
  base_version_id: UuidSchema,
  asset_id: UuidSchema.optional(),
  ops: z.array(OperationSchema).min(1),
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional(),
  parents: z.array(UuidSchema).min(1).max(8).optional()
});

export const VersionSchema = z.object({
  id: UuidSchema,
  project_id: UuidSchema,
  asset_id: UuidSchema,
  sequence: z.number().int().positive(),
  actor_type: z.enum(Object.values(ACTOR_TYPES)),
  actor_user_id: UuidSchema.nullable().optional(),
  actor_provider: z.string().nullable().optional(),
  actor_model: z.string().nullable().optional(),
  actor_on_behalf_of_user_id: UuidSchema.nullable().optional(),
  origin_version_id: UuidSchema.nullable().optional(),
  is_root: z.boolean(),
  capture_fidelity: z.enum(Object.values(CAPTURE_FIDELITY)),
  summary: z.string().nullable().optional(),
  created_at: IsoDateSchema
});

export const WorkingStateSchema = z.object({
  id: UuidSchema,
  project_id: UuidSchema,
  user_id: UuidSchema,
  base_version_id: UuidSchema,
  ops: z.array(OperationSchema),
  preview_asset_id: UuidSchema.nullable().optional(),
  updated_at: IsoDateSchema
});

export const LineageEdgeSchema = z.object({
  version_id: UuidSchema,
  parent_version_id: UuidSchema,
  parent_index: z.number().int().nonnegative(),
  role: z.string()
});

export const LineageResponseSchema = z.object({
  versions: z.array(z.any()),
  edges: z.array(LineageEdgeSchema),
  branch_points: z.array(UuidSchema),
  tips: z.array(UuidSchema),
  roots: z.array(UuidSchema)
});

export const AssetUrlResponseSchema = z.object({
  asset_id: UuidSchema,
  url: z.string().url(),
  expires_in: z.number().int().positive()
});

export const CreateMemorySchema = z.object({
  type: z.enum(Object.values(MEMORY_TYPES)),
  statement: z.string().trim().min(1).max(500),
  rationale: z.string().trim().max(2000).optional(),
  source_refs: z.object({
    versions: z.array(UuidSchema).optional(),
    actions: z.array(UuidSchema).optional()
  }).default({})
});

export const ForkProjectSchema = z.object({
  source_version_id: UuidSchema,
  name: z.string().trim().min(1).max(LIMITS.MAX_PROJECT_NAME_LENGTH),
  creative_goal: z.string().trim().max(LIMITS.MAX_CREATIVE_GOAL_LENGTH).optional().nullable()
});

export const MergeVersionsSchema = z.object({
  source_version_ids: z.array(UuidSchema).min(2).max(8),
  strategy: z.literal('manual').default('manual'),
  resolutions: z.record(z.any()).default({}),
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional()
});

export const DiffRequestSchema = z.object({
  from_version_id: UuidSchema,
  to_version_id: UuidSchema,
  force_refresh: z.boolean().default(false)
});

export const MemoryParamsSchema = z.object({
  memoryId: UuidSchema
});

export const UpdateMemorySchema = z.object({
  statement: z.string().trim().min(1).max(500),
  rationale: z.string().trim().max(2000).optional(),
  source_refs: z.object({
    versions: z.array(UuidSchema).optional(),
    actions: z.array(UuidSchema).optional()
  }).default({})
});

export const MemoryQuerySchema = z.object({
  type: z.enum(Object.values(MEMORY_TYPES)).optional(),
  status: z.enum(Object.values(MEMORY_STATUS)).default(MEMORY_STATUS.ACTIVE)
});

export const MemorySchema = z.object({
  id: UuidSchema,
  project_id: UuidSchema,
  type: z.enum(Object.values(MEMORY_TYPES)),
  statement: z.string(),
  rationale: z.string().nullable().optional(),
  source_refs: z.record(z.any()),
  origin: z.string(),
  status: z.enum(Object.values(MEMORY_STATUS)),
  created_by_user_id: UuidSchema,
  created_at: IsoDateSchema,
  updated_at: IsoDateSchema
});

export const CopilotMessageSchema = z.object({
  conversation_id: UuidSchema.optional(),
  question: z.string().trim().min(1).max(4000)
});

export const CopilotConversationParamsSchema = z.object({
  conversationId: UuidSchema
});

export const ApiTokenCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(['projects:read', 'versions:read', 'memory:read', 'memory:write', 'versions:write'])).min(1).max(5)
});

export const ApiTokenParamsSchema = z.object({
  tokenId: UuidSchema
});

export const CopilotPlanSchema = z.object({
  tools: z.array(z.enum([
    'get_version', 'get_path', 'get_subtree', 'get_children',
    'get_lineage_overview', 'get_diff', 'search_versions',
    'search_memory', 'list_ai_generations'
  ])).max(9),
  arguments: z.record(z.record(z.any())).default({}),
  resolved: z.boolean().default(true),
  clarification: z.string().nullable().default(null)
});

export const CopilotCitationSchema = z.object({
  kind: z.enum(['version', 'memory', 'diff']),
  id: z.string().min(1),
  label: z.string().optional()
});

export const CopilotAnswerSchema = z.object({
  text: z.string(),
  citations: z.array(CopilotCitationSchema),
  tools_used: z.array(z.string()),
  grounded: z.boolean()
});
