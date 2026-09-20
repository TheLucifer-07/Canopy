import { ERROR_CODES } from '@canopy/config';
import { ApiError } from './errors.js';
import { getSupabaseAdmin, getUserFromAccessToken } from './supabase.js';

export async function authenticateRequest(request) {
  const authHeader = request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';

  if (!token) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Authentication is required.', { statusCode: 401 });
  }

  const user = await getUserFromAccessToken(token, getSupabaseAdmin());
  if (!user) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired access token.', { statusCode: 401 });
  }

  return Object.freeze({
    userId: user.id,
    email: user.email || null,
    token
  });
}
