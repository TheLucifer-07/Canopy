import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../../services/api/src/lib/config.js';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(pool = null) {
  const activePool = pool || new Pool(config.database.url ? {
    connectionString: config.database.url,
    ssl: config.database.ssl || config.database.url.includes('supabase.co') || config.database.url.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined
  } : {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false
  });

  const client = await activePool.connect();
  try {
    const files = readdirSync(__dirname)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`Running ${files.length} migrations against database...`);
    for (const file of files) {
      const sql = readFileSync(resolve(__dirname, file), 'utf8');
      console.log(`- Executing migration: ${file}`);
      await client.query(sql);
    }
    console.log('✓ All database migrations executed successfully.');
  } finally {
    client.release();
    if (!pool) await activePool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
