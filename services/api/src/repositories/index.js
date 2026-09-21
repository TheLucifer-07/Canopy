import { PostgresCoreRepository } from './postgresCoreRepository.js';

export function createRepositories(overrides = {}) {
  return {
    core: overrides.core || new PostgresCoreRepository(overrides)
  };
}

export { PostgresCoreRepository };
