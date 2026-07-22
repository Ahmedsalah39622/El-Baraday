const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // Add missing columns to order_items
  await client.query(`
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS extras TEXT;
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;
  `);

  console.log('✅ Added missing columns (size, extras, notes) to order_items table!');

  // Now test orders fetch query
  const res = await client.query(`
    SELECT o.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', oi.product_name,
                 'name', oi.product_name,
                 'price', oi.price,
                 'quantity', oi.quantity,
                 'size', oi.size,
                 'extras', oi.extras,
                 'notes', oi.notes
               )
             ) FILTER (WHERE oi.id IS NOT NULL), '[]'
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 50;
  `);

  console.log(`🎉 SUCCESS! Fetched ${res.rows.length} orders from Supabase DB with items included!`);
  if (res.rows.length > 0) {
    console.log('Sample order:', {
      order_number: res.rows[0].order_number,
      customer_name: res.rows[0].customer_name,
      total: res.rows[0].total,
      items: res.rows[0].items
    });
  }

  await client.end();
}

main().catch(err => {
  console.error('❌ Error updating order_items schema:', err);
  process.exit(1);
});
