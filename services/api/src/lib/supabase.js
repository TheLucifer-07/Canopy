/**
 * Supabase client boundary (server-side only).
 * Uses the service-role key for trusted server operations.
 *
 * NEVER import this file from apps/web or any browser bundle.
 * Browser code should use @supabase/supabase-js with the anon key only.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let adminClient;

export function getSupabaseAdmin() {
  const { url, serviceRoleKey } = config.supabase;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
}

export async function getUserFromAccessToken(accessToken, supabase = getSupabaseAdmin()) {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}
