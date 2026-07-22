const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // Add offer columns to products table
  await client.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_offer BOOLEAN DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_components TEXT;
  `);

  // Insert default sample offers if category_id = '5' doesn't exist yet
  const resCheck = await client.query("SELECT COUNT(*) FROM products WHERE category_id = '5'");
  if (parseInt(resCheck.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO products (id, category_id, name, price, original_price, is_offer, offer_components, image_url, sort_order)
      VALUES
        (gen_random_uuid()::TEXT, '5', 'عرض ميكس البردعي الفاخر', 140, 185, true, '2 حواوشي ميكس أجبان + بيبسي 1 لتر', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80', 16),
        (gen_random_uuid()::TEXT, '5', 'عرض الصحاب (4 حواوشي)', 220, 270, true, '4 حواوشي فراخ/سجق + 2 بطاطس + بيبسي', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', 17);
    `);
    console.log('🎁 Seeded sample special offers!');
  }

  console.log('✅ Supabase products table updated with offer fields!');
  await client.end();
}

main().catch(err => {
  console.error('❌ Error updating offers schema:', err);
  process.exit(1);
});
