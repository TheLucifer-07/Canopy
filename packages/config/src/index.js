/**
 * @canopy/config — public (browser-safe) configuration
 *
 * This file may only contain things safe to ship to the browser.
 * Never import server.js or service-role keys here.
 */

export const PLATFORM_NAME = 'Canopy';
export const PLATFORM_VERSION = '0.1.0';
export const API_VERSION = 'v1';

// ── Capture Fidelity Tiers (Blueprint §2.5, R-14) ───────────────────────────
export const CAPTURE_FIDELITY = Object.freeze({
  FULL: 'full',
  PARTIAL: 'partial',
  OUTPUT_ONLY: 'output_only'
});

// ── Actor Types (Blueprint §7.3) ─────────────────────────────────────────────
export const ACTOR_TYPES = Object.freeze({
  HUMAN: 'human',
  MODEL: 'model'
});

// ── Action Types ─────────────────────────────────────────────────────────────
export const ACTION_TYPES = Object.freeze({
  IMPORT: 'import',
  COMMIT: 'commit',
  GENERATE: 'generate',
  ADJUST: 'adjust',
  TRANSFORM: 'transform',
  MERGE: 'merge',
  FORK: 'fork',
  CAPTURE: 'capture'
});

// ── Memory ───────────────────────────────────────────────────────────────────
export const MEMORY_TYPES = Object.freeze({
  GOAL: 'goal',
  INSIGHT: 'insight',
  DECISION: 'decision',
  PREFERENCE: 'preference',
  REJECTION: 'rejection',
  INTENT: 'intent',
  CONSTRAINT: 'constraint'
});

export const MEMORY_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUPERSEDED: 'superseded',
  ARCHIVED: 'archived',
  PROPOSED: 'proposed'
});

// ── System Limits ─────────────────────────────────────────────────────────────
export const LIMITS = Object.freeze({
  MAX_UPLOAD_SIZE_BYTES: 15 * 1024 * 1024, // 15 MB
  MAX_PROJECT_NAME_LENGTH: 120,
  MAX_CREATIVE_GOAL_LENGTH: 2000,
  MAX_LINEAGE_NODES_PER_REQUEST: 2000,
  SIGNED_URL_TTL_SECONDS: 600 // 10 minutes
});

// ── Error Codes (Blueprint §27.2) ────────────────────────────────────────────
export const ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNAUTHORIZED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_FAILED',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_FORBIDDEN: 'PROJECT_FORBIDDEN',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  VERSION_NOT_FOUND: 'VERSION_NOT_FOUND',
  INVALID_PARENT: 'INVALID_PARENT',
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
  AI_BUDGET_EXCEEDED: 'AI_BUDGET_EXCEEDED',
  MERGE_CONFLICTS: 'MERGE_CONFLICTS',
  INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
  INTERNAL: 'INTERNAL',
  INTERNAL_ERROR: 'INTERNAL'
});
