const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const { query } = require('../src/lib/db');

async function testPutExact() {
  try {
    const id = '2a4ceb20-0b93-44f7-bad5-3244f267fce7';
    const body = { status: 'delivered', driver_name: 'صلاح' };
    const { status, driver_name, driver_id, dispatched_at, delivered_to_customer_at } = body;

    const currentRes = await query('SELECT * FROM orders WHERE id = $1', [id]);
    const currentOrder = currentRes.rows[0];

    const targetDriverName = driver_name !== undefined ? driver_name : currentOrder.driver_name;
    const targetDriverId = driver_id !== undefined ? driver_id : currentOrder.driver_id;
    const targetStatus = status !== undefined ? status : currentOrder.status;

    let dispatchedAtValue = currentOrder.dispatched_at || null;
    let deliveredAtValue = currentOrder.delivered_to_customer_at || null;

    console.log('Executing UPDATE query...');
    const result = await query(
      `UPDATE orders SET
       status = COALESCE($1, status),
       driver_name = COALESCE($2, driver_name),
       driver_id = COALESCE($3, driver_id),
       dispatched_at = $4,
       delivered_to_customer_at = $5
       WHERE id = $6 RETURNING *`,
      [
        targetStatus || null,
        targetDriverName || null,
        targetDriverId || null,
        dispatchedAtValue || null,
        deliveredAtValue || null,
        id
      ]
    );

    console.log('Update result:', result);

    if (targetDriverName || targetDriverId) {
      const cleanName = (targetDriverName || '').trim();
      const cleanId = (targetDriverId || '').trim();

      console.log('Executing driver attendance update...');
      const driverRes = await query(
        `UPDATE driver_attendance SET status = 'ready', current_order_id = NULL, check_in_time = CURRENT_TIMESTAMP
         WHERE (TRIM(driver_name) = $1 OR driver_name ILIKE $1 OR (driver_id = $2 AND $2 != '')) AND check_out_time IS NULL`,
        [cleanName, cleanId]
      );
      console.log('Driver update result:', driverRes);
    }

    process.exit(0);
  } catch (e) {
    console.error('Fatal error in PUT:', e);
    process.exit(1);
  }
}

testPutExact();
