const { query } = require('./src/lib/db');

async function testInitQueries() {
  try {
    const branchesRes = await query('SELECT * FROM branches ORDER BY name ASC');
    console.log('branches:', branchesRes.rows.length);

    const productsRes = await query('SELECT * FROM products ORDER BY sort_order ASC');
    console.log('products:', productsRes.rows.length);

    const customersRes = await query('SELECT * FROM customers LIMIT 100');
    console.log('customers:', customersRes.rows.length);

    const ordersRes = await query('SELECT o.*, b.name as branch_name FROM orders o LEFT JOIN branches b ON o.branch_id = b.id ORDER BY o.created_at DESC LIMIT 500');
    console.log('orders:', ordersRes.rows.length);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

testInitQueries();
