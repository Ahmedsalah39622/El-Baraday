const { query } = require('../src/lib/db');

async function testCreateAndUpdate() {
  try {
    console.log('🔍 Inserting test order...');
    const ins = await query(`
      INSERT INTO orders (id, order_number, order_type, customer_name, total, status, branch_id)
      VALUES ('test_ord_123', '999', 'delivery', 'عميل تجريبي', 100, 'preparing', 'b1')
      RETURNING *
    `);
    console.log('Inserted:', ins.rows[0]);

    console.log('🔍 Testing update query...');
    const updateRes = await query(
      `UPDATE orders SET
       status = COALESCE($1, status),
       driver_name = COALESCE($2, driver_name),
       driver_id = COALESCE($3, driver_id),
       dispatched_at = $4,
       delivered_to_customer_at = $5
       WHERE id = $6 RETURNING *`,
      ['dispatched', 'علي', 'd1', new Date().toISOString(), null, 'test_ord_123']
    );
    console.log('✅ Updated successfully:', updateRes.rows[0]);

    // Clean up
    await query(`DELETE FROM orders WHERE id = 'test_ord_123'`);
    console.log('Cleaned up test order.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

testCreateAndUpdate();
