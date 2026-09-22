import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  validateLoginInput,
  validateSignupInput
} from '../../apps/web/src/features/auth/authValidation.js';

describe('Phase 2 auth validation', () => {
  it('normalizes email and validates login fields', () => {
    assert.equal(normalizeEmail('  USER@Example.TEST  '), 'user@example.test');
    assert.deepEqual(validateLoginInput({ email: 'bad', password: '' }), {
      email: 'Enter a valid email address.',
      password: 'Enter your password.'
    });
    assert.deepEqual(validateLoginInput({ email: 'user@example.test', password: 'canopy-demo-pass' }), {});
  });

  it('matches backend signup password and email requirements', () => {
    assert.deepEqual(validateSignupInput({
      displayName: 'Canopy User',
      email: 'user@example.test',
      password: 'short',
      confirmPassword: 'different'
    }), {
      password: 'Password must be at least 8 characters.',
      confirmPassword: 'Passwords do not match.'
    });
    assert.deepEqual(validateSignupInput({
      displayName: '',
      email: 'user@example.test',
      password: 'canopy-demo-pass',
      confirmPassword: 'canopy-demo-pass'
    }), {});
  });
});
