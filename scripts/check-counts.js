const mysql = require('mysql2/promise');

async function checkData() {
  try {
    const conn = await mysql.createConnection({
      host: 'srv1788.hstgr.io',
      user: 'u407531143_bara',
      password: 'Q+x;s3r=n9',
      database: 'u407531143_bara',
      port: 3306
    });
    const tables = ['products', 'categories', 'orders', 'customers', 'branches', 'users', 'shifts', 'order_items', 'restaurant_tables'];
    for (const t of tables) {
      const [res] = await conn.query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`${t}: ${res[0].count}`);
    }
    
    // Sample 5 products and 5 orders
    const [prods] = await conn.query(`SELECT id, name, price FROM products LIMIT 5`);
    console.log('Sample products:', prods);

    const [orders] = await conn.query(`SELECT id, order_number, total, created_at FROM orders ORDER BY created_at DESC LIMIT 5`);
    console.log('Sample orders:', orders);

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkData();
