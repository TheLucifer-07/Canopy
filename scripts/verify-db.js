import pg from 'pg';
import { serverConfig } from '@canopy/config/server';

const { Pool } = pg;

async function verifyDatabase() {
  const isUrl = Boolean(serverConfig.database.url);
  console.log('Database connection mode:', isUrl ? 'DATABASE_URL (Remote/Supabase Pooler)' : 'Local Host/Port parameters');

  const pool = new Pool(serverConfig.database.url ? {
    connectionString: serverConfig.database.url,
    ssl: { rejectUnauthorized: false }
  } : {
    host: serverConfig.database.host,
    port: serverConfig.database.port,
    database: serverConfig.database.database,
    user: serverConfig.database.user,
    password: serverConfig.database.password,
    ssl: serverConfig.database.ssl ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Connection check
    const client = await pool.connect();
    const versionRes = await client.query('SELECT version(), current_database(), current_user');
    console.log('✓ PostgreSQL connection succeeded');
    console.log('  DB Server:', versionRes.rows[0].version.split(' on ')[0]);
    console.log('  Database:', versionRes.rows[0].current_database);
    console.log('  User:', versionRes.rows[0].current_user);

    // 2. pgvector extension check
    const vectorRes = await client.query("SELECT extname, extversion FROM pg_extension WHERE extname='vector'");
    if (vectorRes.rows.length > 0) {
      console.log(`✓ pgvector extension available (version: ${vectorRes.rows[0].extversion})`);
    } else {
      console.log('✗ pgvector extension NOT found');
    }

    // 3. Tables check
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('✓ Public tables found in database:', tables.join(', '));

    const requiredTables = [
      'users', 'projects', 'versions', 'lineage_edges',
      'assets', 'project_assets', 'memories', 'profiles',
      'copilot_conversations', 'copilot_messages', 'api_tokens', 'semantic_diffs'
    ];
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    if (missingTables.length === 0) {
      console.log('✓ All 12 core Canopy schema tables exist, including profiles');
    } else {
      console.log('✗ Missing tables:', missingTables.join(', '));
    }

    // 4. Migration check
    const migRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = '_migrations'");
    if (migRes.rows.length > 0) {
      const migs = await client.query('SELECT name FROM _migrations ORDER BY id');
      console.log('✓ Applied migrations:', migs.rows.map(r => r.name).join(', '));
    }

    // 5. Neon Campaign check
    const neonRes = await client.query("SELECT id, name, creative_goal FROM projects WHERE name ILIKE '%Neon%' OR name ILIKE '%Campaign%'");
    console.log(`✓ Neon Campaign project(s) found: ${neonRes.rows.length}`);
    if (neonRes.rows.length > 0) {
      const p = neonRes.rows[0];
      console.log(`  Project: "${p.name}" (ID: ${p.id})`);

      // 6. Versions count
      const verRes = await client.query("SELECT count(*)::int as count FROM versions WHERE project_id = $1", [p.id]);
      console.log(`✓ Versions for project: ${verRes.rows[0].count}`);

      // 7. Lineage edges
      const edgeRes = await client.query("SELECT count(*)::int as count FROM lineage_edges WHERE project_id = $1", [p.id]);
      console.log(`✓ Lineage edges for project: ${edgeRes.rows[0].count}`);

      // 8. Memories count
      const memRes = await client.query("SELECT count(*)::int as count FROM memories WHERE project_id = $1", [p.id]);
      console.log(`✓ Memories for project: ${memRes.rows[0].count}`);

      // 9. Assets count
      const assetRes = await client.query("SELECT count(*)::int as count FROM project_assets WHERE project_id = $1", [p.id]);
      console.log(`✓ Assets granted to project: ${assetRes.rows[0].count}`);
    }

    // 10. Overall totals
    const totalUsers = await client.query('SELECT count(*)::int as count FROM users');
    const totalProjects = await client.query('SELECT count(*)::int as count FROM projects');
    const totalVersions = await client.query('SELECT count(*)::int as count FROM versions');
    const totalProfiles = await client.query('SELECT count(*)::int as count FROM profiles');
    console.log('\n--- Workspace Aggregate Counts ---');
    console.log('Total Users:', totalUsers.rows[0].count);
    console.log('Total Profiles:', totalProfiles.rows[0].count);
    console.log('Total Projects:', totalProjects.rows[0].count);
    console.log('Total Versions:', totalVersions.rows[0].count);

    client.release();
    await pool.end();
  } catch (err) {
    console.error('✗ Database verification failed with error:', err.message);
    process.exit(1);
  }
}

verifyDatabase();
