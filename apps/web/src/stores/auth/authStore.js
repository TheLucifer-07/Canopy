import { create } from 'zustand';
import { createAuthService } from '../../services/auth/authService.js';

const service = createAuthService();

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  status: 'initializing',
  error: '',
  async restore() {
    const token = service.readToken();
    if (!token) {
      set({ session: null, user: null, status: 'unauthenticated', error: '' });
      return;
    }
    set({ status: 'initializing', error: '' });
    try {
      const session = await service.validateToken(token);
      set({ session, status: 'authenticated', error: '' });
    } catch (error) {
      service.clearToken();
      set({ session: null, user: null, status: 'unauthenticated', error: service.messageFor(error, 'Your session expired. Please sign in again.') });
    }
  },
  async login(input) {
    set({ status: 'authenticating', error: '' });
    try {
      const result = await service.login(input);
      service.saveToken(result.access_token);
      set({ session: { access_token: result.access_token }, user: result.user || null, status: 'authenticated', error: '' });
      return result;
    } catch (error) {
      const message = service.messageFor(error, 'Invalid email or password.');
      set({ status: 'unauthenticated', error: message });
      throw Object.assign(error, { message });
    }
  },
  async signup(input) {
    set({ status: 'authenticating', error: '' });
    try {
      const result = await service.register(input);
      service.saveToken(result.access_token);
      set({ session: { access_token: result.access_token }, user: result.user || null, status: 'authenticated', error: '' });
      return result;
    } catch (error) {
      const message = service.messageFor(error, 'Could not create that account.');
      set({ status: 'unauthenticated', error: message });
      throw Object.assign(error, { message });
    }
  },
  logout() {
    service.clearToken();
    set({ session: null, user: null, status: 'unauthenticated', error: '' });
  },
  clearError() {
    if (get().error) set({ error: '' });
  }
}));
