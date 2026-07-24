const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function addAddressesColumn() {
  console.log('🔄 Adding addresses JSONB column to customers table...');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ Added addresses column successfully!');
  } catch (err) {
    console.error('❌ Failed to add addresses column:', err);
  } finally {
    client.release();
    pool.end();
  }
}

addAddressesColumn();
