import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function filesUnder(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
}

describe('secret exposure guard', () => {
  it('does not reference server-only AI keys from browser or Android clients', () => {
    const clientFiles = [
      ...filesUnder('apps/web/src'),
      ...filesUnder('apps/android')
    ];
    for (const file of clientFiles) {
      const source = readFileSync(file, 'utf8');
      assert.equal(source.includes('GEMINI_API_KEY'), false, `${file} references GEMINI_API_KEY`);
      assert.equal(source.includes('XAI_API_KEY'), false, `${file} references XAI_API_KEY`);
      assert.equal(source.includes('SUPABASE_SERVICE_ROLE_KEY'), false, `${file} references SUPABASE_SERVICE_ROLE_KEY`);
    }
  });
});
