import { useMemo } from 'react';
import { CanopyApiClient } from '@canopy/api-client';

export const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/v1` : 'http://localhost:3000/v1');

export function classifyError(error) {
  if (!error) return { type: 'unknown', message: 'An unexpected error occurred.' };

  const status = error.statusCode || error.status || error?.error?.statusCode;
  const code = error.code || error?.error?.code;
  const message = formatError(error);

  if (status === 401 || code === 'UNAUTHENTICATED') {
    return { type: 'unauthenticated', status: 401, code, message };
  }
  if (status === 403 || code === 'FORBIDDEN' || code === 'INSUFFICIENT_SCOPE') {
    return { type: 'forbidden', status: 403, code, message };
  }
  if (status === 404 || code === 'NOT_FOUND' || code?.endsWith('_NOT_FOUND')) {
    return { type: 'not_found', status: 404, code, message };
  }
  if (status === 422 || code === 'VALIDATION_FAILED') {
    return { type: 'validation', status: 422, code, message };
  }
  if (status === 429 || code === 'COPILOT_RATE_LIMITED') {
    return { type: 'rate_limited', status: 429, code, message };
  }
  if (status >= 500 || code === 'SERVER_ERROR' || code === 'DATABASE_ERROR') {
    return { type: 'server_error', status: status || 500, code, message };
  }

  return { type: 'general', status, code, message };
}

export function isNotFoundError(error) {
  const c = classifyError(error);
  return c.type === 'not_found';
}

export function isForbiddenError(error) {
  const c = classifyError(error);
  return c.type === 'forbidden';
}

export function isServerError(error) {
  const c = classifyError(error);
  return c.type === 'server_error';
}

export function formatError(error, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error?.error?.message) return error.error.message;
  if (error?.message) {
    if (error.message === 'Load failed' || error.message === 'Failed to fetch' || error.message.includes('fetch')) {
      return 'Unable to connect to the Canopy API server. Please ensure the server is running.';
    }
    return error.message;
  }
  return fallback;
}

export function useApi(session) {
  return useMemo(() => new CanopyApiClient({
    baseUrl: API_URL,
    token: session?.access_token || null
  }), [session?.access_token]);
}
