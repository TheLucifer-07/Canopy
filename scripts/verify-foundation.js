import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PLATFORM_NAME, PLATFORM_VERSION } from '@canopy/config';
import { INVARIANTS } from '@canopy/domain';
import { HealthResponseSchema } from '@canopy/schemas';
import { CanopyApiClient } from '@canopy/api-client';

console.log(`=== ${PLATFORM_NAME} Foundation Diagnostics (v${PLATFORM_VERSION}) ===\n`);

// 1. Check workspace packages import
console.log('1. Checking workspace package resolutions:');
console.log('   - @canopy/config:', PLATFORM_NAME);
console.log('   - @canopy/domain:', Object.keys(INVARIANTS).length, 'invariants loaded');
console.log('   - @canopy/schemas:', typeof HealthResponseSchema.parse === 'function' ? 'OK' : 'FAIL');
console.log('   - @canopy/api-client:', typeof CanopyApiClient === 'function' ? 'OK' : 'FAIL');

// 2. Verify no TypeScript files (.ts, .tsx, tsconfig.json)
console.log('\n2. Verifying pure JavaScript implementation (No TypeScript):');

function scanForTs(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanForTs(fullPath);
    } else {
      if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry === 'tsconfig.json') {
        throw new Error(`TypeScript file detected: ${fullPath}. Canopy enforces pure JavaScript.`);
      }
    }
  }
}

try {
  scanForTs(process.cwd());
  console.log('   ✓ Pure JavaScript validated. Zero TypeScript files found.');
} catch (err) {
  console.error('   ✗ Violation:', err.message);
  process.exit(1);
}

console.log('\n=== Foundation Diagnostics PASSED Successfully ===');
