const { query } = require('../src/lib/db');

async function migrate() {
  try {
    console.log('🔄 Adding delivered_to_customer_at column to orders table...');
    await query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS delivered_to_customer_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ Column delivered_to_customer_at added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
