import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLATFORM_NAME,
  PLATFORM_VERSION,
  ACTION_TYPES,
  ACTOR_TYPES,
  CAPTURE_FIDELITY
} from '@canopy/config';
import { INVARIANTS } from '@canopy/domain';
import { CreateProjectSchema } from '@canopy/schemas';

describe('Canopy Monorepo Foundation Tests', () => {
  it('loads configuration constants and fidelity tiers correctly', () => {
    assert.equal(PLATFORM_NAME, 'Canopy');
    assert.equal(PLATFORM_VERSION, '0.1.0');
    assert.equal(CAPTURE_FIDELITY.FULL, 'full');
    assert.equal(ACTOR_TYPES.HUMAN, 'human');
    assert.equal(ACTOR_TYPES.MODEL, 'model');
  });

  it('validates foundational architectural invariants are defined', () => {
    assert.ok(INVARIANTS.I_01_VERSION_IMMUTABILITY);
    assert.ok(INVARIANTS.I_04_ONE_WRITE_PATH);
    assert.ok(INVARIANTS.I_05_AUTHORITATIVE_POSTGRES);
    assert.ok(INVARIANTS.I_08_FORK_COPIES_NOTHING);
    assert.ok(INVARIANTS.I_09_MERGE_REPLAY_DETERMINISM);
  });

  it('validates Zod schema parsing behavior', () => {
    const validProject = CreateProjectSchema.safeParse({
      name: 'Test Project',
      creative_goal: 'Explore human and AI co-creation'
    });
    assert.equal(validProject.success, true);

    const invalidProject = CreateProjectSchema.safeParse({
      name: '' // Empty name should fail
    });
    assert.equal(invalidProject.success, false);
  });
});
