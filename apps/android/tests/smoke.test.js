import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanopyApi, API_URL } from '../src/api.js';
import { validateSignupInput } from '../src/features/auth/authValidation.js';
import { buildWorkspaceModel } from '../src/features/workspace/workspaceData.js';

test('React Native app uses the shared JavaScript API client', () => {
  const client = createCanopyApi('test-token');
  assert.equal(client.baseUrl, API_URL);
  assert.equal(client.token, 'test-token');
});

test('React Native auth validation matches the backend contract', () => {
  assert.deepEqual(validateSignupInput({
    displayName: '',
    email: 'creator@example.test',
    password: 'canopy-demo-pass',
    confirmPassword: 'canopy-demo-pass'
  }), {});
  assert.equal(validateSignupInput({
    displayName: '',
    email: 'bad',
    password: 'short',
    confirmPassword: 'mismatch'
  }).password, 'Password must be at least 8 characters.');
});

test('React Native workspace model uses project lineage data', () => {
  const model = buildWorkspaceModel(
    [{ id: 'project-1', name: 'Neon Campaign', version_sequence_counter: 5, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
    { 'project-1': { versions: [{ id: 'v5', sequence: 5, label: 'V5 Merge', created_at: '2026-01-05T00:00:00.000Z' }] } }
  );
  assert.equal(model.projects[0].name, 'Neon Campaign');
  assert.equal(model.recentVersions[0].label, 'V5 Merge');
  assert.equal(model.activity.length, 1);
});
