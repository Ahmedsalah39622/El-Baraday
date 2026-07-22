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
    { id: 'p1', name: 'حواوشي ساده صغير', category_id: '1', price: 45, size: 'صغير', image_url: '/images/hawawshi_sade.png', sort_order: 1 },
    { id: 'p2', name: 'حواوشي ساده كبير', category_id: '1', price: 75, size: 'كبير', image_url: '/images/hawawshi_sade.png', sort_order: 2 },
    { id: 'p3', name: 'حواوشي فراخ صغير', category_id: '1', price: 55, size: 'صغير', image_url: '/images/hawawshi_chicken.png', sort_order: 3 },
    { id: 'p4', name: 'حواوشي فراخ كبير', category_id: '1', price: 90, size: 'كبير', image_url: '/images/hawawshi_chicken.png', sort_order: 4 },
    { id: 'p5', name: 'حواوشي سلامي صغير', category_id: '1', price: 65, size: 'صغير', image_url: '/images/hawawshi_salami.png', sort_order: 5 },
    { id: 'p6', name: 'حواوشي سلامي كبير', category_id: '1', price: 110, size: 'كبير', image_url: '/images/hawawshi_salami.png', sort_order: 6 },
    { id: 'p7', name: 'حواوشي سجق صغير', category_id: '1', price: 60, size: 'صغير', image_url: '/images/hawawshi_sausage.png', sort_order: 7 },
    { id: 'p8', name: 'حواوشي سجق كبير', category_id: '1', price: 100, size: 'كبير', image_url: '/images/hawawshi_sausage.png', sort_order: 8 },
    { id: 'p9', name: 'حواوشي ميكس أجبان صغير', category_id: '2', price: 70, size: 'صغير', image_url: '/images/hawawshi_mixes.png', sort_order: 9 },
    { id: 'p10', name: 'حواوشي ميكس أجبان كبير', category_id: '2', price: 120, size: 'كبير', image_url: '/images/hawawshi_mixes.png', sort_order: 10 },
    { id: 'p11', name: 'إضافة جبنة موتزاريلا', category_id: '4', price: 25, size: 'عادي', image_url: '/images/cheese_addition.png', sort_order: 11 },
    { id: 'p12', name: 'إضافة جبنة رومي', category_id: '4', price: 20, size: 'عادي', image_url: '/images/cheese_addition.png', sort_order: 12 },
    { id: 'p13', name: 'إضافة جبنة شيدر', category_id: '4', price: 20, size: 'عادي', image_url: '/images/cheese_addition.png', sort_order: 13 },
    { id: 'p14', name: 'بيبسي كولا 1 لتر', category_id: '3', price: 30, size: '1L', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80', sort_order: 14 },
    { id: 'p15', name: 'مياه معدنية', category_id: '3', price: 10, size: 'صغير', image_url: '/images/mineral_water.png', sort_order: 15 }
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
