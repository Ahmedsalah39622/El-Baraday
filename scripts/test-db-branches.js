const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const branches = await pool.query('SELECT * FROM branches');
  console.log('Branches:', branches.rows);
  const settings = await pool.query("SELECT * FROM app_settings WHERE key = 'delivery_timer_minutes'");
  console.log('Delivery Timer Setting:', settings.rows);
  pool.end();
}
check();
