const { query } = require('./src/lib/db');

async function testInsert() {
  const orderId = `ord_test_${Date.now()}`;
  const nextNum = 84; // The one that collided
  console.log('Testing insert with order_number = 84...');
  const res = await query(
    `INSERT INTO orders (id, order_number, order_type, payment_method, customer_name, subtotal, total, branch_id, shift_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [orderId, nextNum, 'dine_in', 'cash', 'تجربة', 50, 50, 'b1', 'shift_1789900887809']
  );
  console.log('Insert result:', res);
}

testInsert().catch(console.error).finally(() => process.exit(0));
