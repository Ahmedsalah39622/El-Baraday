const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // 1. Ensure sort_order column exists
  await client.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
  `);

  // 2. Default initial products order seed
  const initialProducts = [
];

  for (const p of initialProducts) {
    await client.query(`
      INSERT INTO products (id, name, category_id, price, size, image_url, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET sort_order = EXCLUDED.sort_order, price = EXCLUDED.price;
    `, [p.id, p.name, p.category_id, p.price, p.size, p.image_url, p.sort_order]);
  }

  const res = await client.query('SELECT id, name, sort_order FROM products ORDER BY sort_order ASC');
  console.log('✅ Supabase products table synced with sort_order!');
  console.table(res.rows);

  await client.end();
}

main().catch(err => {
  console.error('❌ Error updating product sort order:', err);
  process.exit(1);
});
