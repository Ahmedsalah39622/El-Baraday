const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // 1. Create sequence for order_number auto-increment
  await client.query(`
    CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START WITH 35;
    ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq');
    ALTER TABLE orders ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
  `);

  console.log('✅ Created order_number sequence in Supabase PostgreSQL!');

  // 2. Test inserting an order
  const testId = `ord_${crypto.randomUUID()}`;
  const res = await client.query(`
    INSERT INTO orders (id, order_type, customer_name, customer_phone, subtotal, total, paid_amount, cashier_name, status)
    VALUES ($1, 'takeaway', 'عميل تجريبي', '01000000000', 100, 100, 100, 'المدير العام', 'completed')
    RETURNING *;
  `, [testId]);

  console.log('🎉 SUCCESS! Test order created in Supabase DB with auto-generated order_number!');
  console.table(res.rows[0]);

  await client.end();
}

main().catch(err => {
  console.error('❌ Error fixing order_number sequence:', err);
  process.exit(1);
});
