const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
let envUrl = '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) envUrl = match[1].trim();
} catch (e) {}

const connectionString = envUrl || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Supabase PostgreSQL database (eu-west-1 pooler)...');
    await client.connect();
    console.log('✅ Connected successfully to Supabase DB!');

    const sqlPath = path.join(__dirname, '../schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executing full database schema & seed data...');
    await client.query(sql);
    console.log('🎉 Database tables & seed data successfully created on Supabase!');

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\n📋 Created tables in Supabase:');
    tables.rows.forEach(r => console.log(`   ✓ ${r.table_name}`));

    // Verify counts
    const products = await client.query('SELECT COUNT(*) FROM products');
    console.log(`\n🍔 Products in Supabase: ${products.rows[0].count}`);

    const employees = await client.query('SELECT COUNT(*) FROM employees');
    console.log(`👷 Employees in Supabase: ${employees.rows[0].count}`);

    const drivers = await client.query('SELECT COUNT(*) FROM drivers');
    console.log(`🛵 Drivers in Supabase: ${drivers.rows[0].count}`);

    const inventory = await client.query('SELECT COUNT(*) FROM inventory_items');
    console.log(`📦 Inventory items in Supabase: ${inventory.rows[0].count}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('\n🔒 Connection closed.');
  }
}

main();
