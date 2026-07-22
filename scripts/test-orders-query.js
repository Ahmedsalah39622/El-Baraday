const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  try {
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
      LIMIT 10;
    `);

    console.log('✅ Query succeeded!');
    console.log(`Fetched ${res.rows.length} rows.`);
    if (res.rows.length > 0) {
      console.log('First row:', res.rows[0]);
    }
  } catch (err) {
    console.error('❌ SQL Query Error:', err);
  }

  await client.end();
}

main().catch(err => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
