const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const { query } = require('../src/lib/db');

async function migrateSupabase() {
  try {
    console.log('🔄 Adding delivered_to_customer_at column to Supabase PostgreSQL database...');
    const res = await query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS delivered_to_customer_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Migration query result:', res);
    console.log('✅ Column delivered_to_customer_at added successfully to Supabase DB!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrateSupabase();
