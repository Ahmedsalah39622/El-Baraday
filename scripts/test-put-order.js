const { query } = require('../src/lib/db');

async function testPut() {
  try {
    console.log('🔍 Testing PUT query on orders table...');
    const orderRes = await query('SELECT id, status, driver_name, driver_id, dispatched_at FROM orders LIMIT 1');
    if (!orderRes.rows.length) {
      console.log('No orders found');
      process.exit(0);
    }
    const o = orderRes.rows[0];
    console.log('Target order:', o);

    const updateRes = await query(
      `UPDATE orders SET
       status = COALESCE($1, status),
       driver_name = COALESCE($2, driver_name),
       driver_id = COALESCE($3, driver_id),
       dispatched_at = $4,
       delivered_to_customer_at = $5
       WHERE id = $6 RETURNING *`,
      [
        'dispatched',
        o.driver_name || 'علي',
        o.driver_id || null,
        new Date().toISOString(),
        null,
        o.id
      ]
    );

    console.log('✅ Query succeeded:', updateRes.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Query failed with error:', err);
    process.exit(1);
  }
}

testPut();
