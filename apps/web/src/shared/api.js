import { useMemo } from 'react';
import { CanopyApiClient } from '@canopy/api-client';

export const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/v1` : 'http://localhost:3000/v1');

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
