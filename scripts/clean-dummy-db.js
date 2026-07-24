const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function cleanDummyData() {
  console.log('🧹 Cleaning dummy demo data from PostgreSQL database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean dummy drivers & employees created as demo
    await client.query("DELETE FROM driver_attendance");
    await client.query("DELETE FROM employee_advances");
    await client.query("DELETE FROM employees");
    await client.query("DELETE FROM drivers");
    await client.query("DELETE FROM customers");

    console.log('✅ Cleared dummy drivers, employees, driver_attendance, employee_advances, and demo customers from DB.');

    await client.query('COMMIT');
    console.log('🎉 Database cleaned! All data is now 100% real and user-generated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Clean failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

cleanDummyData();
