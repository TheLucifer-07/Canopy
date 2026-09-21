import { ERROR_CODES } from '@canopy/config';

const STATUS_BY_CODE = {
  [ERROR_CODES.UNAUTHENTICATED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.PROJECT_FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.PROJECT_NOT_FOUND]: 404,
  [ERROR_CODES.ASSET_NOT_FOUND]: 404,
  [ERROR_CODES.VERSION_NOT_FOUND]: 404,
  [ERROR_CODES.VALIDATION_FAILED]: 422,
  [ERROR_CODES.INVALID_PARENT]: 422,
  MEMORY_LINEAGE_FACT: 422,
  MERGE_CONFLICT: 409,
  INVALID_MERGE: 400,
  MERGE_CROSS_PROJECT: 400,
  DIFF_NOT_AVAILABLE: 404,
  MEMORY_NOT_FOUND: 404,
  FORK_SOURCE_NOT_FOUND: 404,
  FORK_ACCESS_DENIED: 403,
  AI_BUDGET_EXCEEDED: 429,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_PROVIDER_CONFIG_INVALID: 503,
  AI_PROVIDER_FAILED: 502,
  AI_PROVIDER_AUTH_FAILED: 502,
  AI_PROVIDER_RATE_LIMITED: 503,
  AI_PROVIDER_MALFORMED_RESPONSE: 502,
  COPILOT_RATE_LIMITED: 429,
  COPILOT_CONVERSATION_NOT_FOUND: 404,
  COPILOT_TOOL_NOT_ALLOWED: 422,
  [ERROR_CODES.CYCLE_DETECTED]: 409,
  [ERROR_CODES.IDEMPOTENCY_KEY_REUSED]: 409,
  [ERROR_CODES.STORAGE_ERROR]: 500,
  [ERROR_CODES.INTERNAL]: 500
};

export class ApiError extends Error {
  constructor(code, message, { statusCode, details = {}, retryable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode || STATUS_BY_CODE[code] || 500;
    this.details = details;
    this.retryable = retryable;
  }
}

export function sendApiError(reply, error, requestId) {
  const code = error.code || ERROR_CODES.INTERNAL;
  const statusCode = error.statusCode || STATUS_BY_CODE[code] || 500;
  const message = statusCode >= 500 ? 'Internal server error.' : error.message;
  return reply.status(statusCode).send({
    error: {
      code,
      message,
      details: error.details && Object.keys(error.details).length ? error.details : undefined,
      retryable: Boolean(error.retryable),
      request_id: requestId
    }
  });
}

export function notFound(code, message) {
  return new ApiError(code, message, { statusCode: 404 });
}
