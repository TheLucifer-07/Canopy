import { SupabaseCoreRepository } from './supabaseCoreRepository.js';

export function createRepositories(overrides = {}) {
  return {
    core: overrides.core || new SupabaseCoreRepository(overrides)
  };
}

export { SupabaseCoreRepository };
