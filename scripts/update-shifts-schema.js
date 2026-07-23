const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // Add status column to shifts table if missing
  await client.query(`
    ALTER TABLE shifts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  `);
  console.log('✅ Added status column to shifts table!');

  const res = await client.query(`SELECT * FROM shifts ORDER BY start_time DESC LIMIT 10`);
  console.log('Recent shifts:', res.rows);

  await client.end();
}

main().catch(err => {
  console.error('❌ Error updating shifts table:', err);
  process.exit(1);
});
