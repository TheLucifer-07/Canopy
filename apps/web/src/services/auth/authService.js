import { CanopyApiClient } from '@canopy/api-client';
import { API_URL, formatError } from '../../shared/api.js';
import { normalizeEmail } from '../../features/auth/authValidation.js';

export const ACCESS_TOKEN_KEY = 'canopy_access_token';

export function createAuthService({ storage = window.localStorage } = {}) {
  const client = new CanopyApiClient({ baseUrl: API_URL });

  return {
    readToken() {
      return storage.getItem(ACCESS_TOKEN_KEY);
    },
    saveToken(token) {
      storage.setItem(ACCESS_TOKEN_KEY, token);
    },
    clearToken() {
      storage.removeItem(ACCESS_TOKEN_KEY);
    },
    async login({ email, password }) {
      return client.login({ email: normalizeEmail(email), password });
    },
    async register({ displayName, email, password }) {
      return client.register({
        email: normalizeEmail(email),
        password,
        display_name: displayName?.trim() || null
      });
    },
    async validateToken(token) {
      const authed = new CanopyApiClient({ baseUrl: API_URL, token });
      await authed.listTokens();
      return { access_token: token };
    },
    messageFor(error, fallback = 'Authentication failed.') {
      if (error?.status === 429) return 'Too many attempts. Please wait and try again.';
      return formatError(error, fallback);
    }
  };
}
