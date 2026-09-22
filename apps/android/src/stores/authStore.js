import { createAuthService } from '../services/authService.js';

const service = createAuthService();

export function createInitialAuthState() {
  return { session: null, user: null, status: 'initializing', error: '' };
}

export function createAuthActions(setState) {
  return {
    async restore() {
      const token = await service.readToken();
      if (!token) {
        setState({ session: null, user: null, status: 'unauthenticated', error: '' });
        return;
      }
      try {
        const session = await service.validateToken(token);
        setState({ session, status: 'authenticated', error: '' });
      } catch (error) {
        await service.clearToken();
        setState({ session: null, user: null, status: 'unauthenticated', error: service.messageFor(error, 'Your session expired. Please sign in again.') });
      }
    },
    async login(input) {
      setState({ status: 'authenticating', error: '' });
      try {
        const result = await service.login(input);
        await service.saveToken(result.access_token);
        setState({ session: { access_token: result.access_token }, user: result.user || null, status: 'authenticated', error: '' });
      } catch (error) {
        const message = service.messageFor(error, 'Invalid email or password.');
        setState({ session: null, user: null, status: 'unauthenticated', error: message });
        throw Object.assign(error, { message });
      }
    },
    async signup(input) {
      setState({ status: 'authenticating', error: '' });
      try {
        const result = await service.register(input);
        await service.saveToken(result.access_token);
        setState({ session: { access_token: result.access_token }, user: result.user || null, status: 'authenticated', error: '' });
      } catch (error) {
        const message = service.messageFor(error, 'Could not create that account.');
        setState({ session: null, user: null, status: 'unauthenticated', error: message });
        throw Object.assign(error, { message });
      }
    },
    async logout() {
      await service.clearToken();
      setState({ session: null, user: null, status: 'unauthenticated', error: '' });
    },
    clearError() {
      setState({ error: '' });
    }
  };
}
