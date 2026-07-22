const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // Ensure orders and order_items tables exist without restrictive FK constraints
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      order_number SERIAL,
      order_type TEXT DEFAULT 'dine_in',
      table_number TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_area TEXT,
      customer_address TEXT,
      driver_id TEXT,
      driver_name TEXT,
      status TEXT DEFAULT 'completed',
      subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
      delivery_fee NUMERIC(10, 2) DEFAULT 0,
      discount NUMERIC(10, 2) DEFAULT 0,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(10, 2) DEFAULT 0,
      remaining_amount NUMERIC(10, 2) DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      cashier_name TEXT DEFAULT 'administrator',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT,
      product_name TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      quantity INT DEFAULT 1,
      size TEXT,
      extras TEXT,
      notes TEXT
    );
  `);

  // Test insert
  const res = await client.query(`
    INSERT INTO orders (order_type, customer_name, customer_phone, subtotal, total, paid_amount, cashier_name, status)
    VALUES ('takeaway', 'عميل تجريبي', '01000000000', 100, 100, 100, 'المدير العام', 'completed')
    RETURNING *;
  `);

  console.log('✅ Test order created successfully on Supabase DB!');
  console.log(res.rows[0]);

  await client.end();
}

main().catch(err => {
  console.error('❌ Error testing order insert:', err);
  process.exit(1);
});
