import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TEXT_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.kt', '.kts', '.xml', '.properties', '.md', '.gradle', '.html', '.css']);

function filesUnder(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    if (entry.startsWith('.') || entry === 'build' || entry === 'node_modules' || entry === 'dist') continue;
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...filesUnder(path));
    else if (stat.isFile() && TEXT_EXTS.has(path.slice(path.lastIndexOf('.')))) {
      files.push(path);
    }
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
      assert.equal(source.includes('GROQ_API_KEY'), false, `${file} references GROQ_API_KEY`);
    }
  });
});
