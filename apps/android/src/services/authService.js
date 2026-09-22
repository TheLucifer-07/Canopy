import * as SecureStore from 'expo-secure-store';
import { CanopyApiClient } from '@canopy/api-client';
import { API_URL } from '../api.js';
import { normalizeEmail } from '../features/auth/authValidation.js';

const ACCESS_TOKEN_KEY = 'canopy_access_token';

export function createAuthService() {
  const client = new CanopyApiClient({ baseUrl: API_URL });
  return {
    async readToken() {
      return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    },
    async saveToken(token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    },
    async clearToken() {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
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
      return error?.error?.message || error?.message || fallback;
    }
  };
}
