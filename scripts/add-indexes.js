const mysql = require('mysql2/promise');

async function addIndexes() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'srv1788.hstgr.io',
      user: 'u407531143_bara',
      password: 'Q+x;s3r=n9',
      database: 'u407531143_bara',
      port: 3306
    });
    console.log('Connected to Hostinger MySQL');

    const indexes = [
      { table: 'orders', name: 'idx_orders_created_at', sql: 'CREATE INDEX idx_orders_created_at ON orders(created_at)' },
      { table: 'orders', name: 'idx_orders_branch_created', sql: 'CREATE INDEX idx_orders_branch_created ON orders(branch_id, created_at)' },
      { table: 'orders', name: 'idx_orders_status', sql: 'CREATE INDEX idx_orders_status ON orders(status)' },
      { table: 'order_items', name: 'idx_order_items_order_id', sql: 'CREATE INDEX idx_order_items_order_id ON order_items(order_id)' },
      { table: 'shifts', name: 'idx_shifts_branch_status', sql: 'CREATE INDEX idx_shifts_branch_status ON shifts(branch_id, status)' },
      { table: 'driver_attendance', name: 'idx_driver_attendance_checkout', sql: 'CREATE INDEX idx_driver_attendance_checkout ON driver_attendance(check_out_time, branch_id)' },
      { table: 'customers', name: 'idx_customers_phone', sql: 'CREATE INDEX idx_customers_phone ON customers(phone)' },
      { table: 'invoices', name: 'idx_invoices_created', sql: 'CREATE INDEX idx_invoices_created ON invoices(created_at)' }
    ];

    for (const idx of indexes) {
      try {
        await conn.query(idx.sql);
        console.log(`✅ Created index ${idx.name} on ${idx.table}`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
          console.log(`ℹ️ Index ${idx.name} already exists on ${idx.table}`);
        } else {
          console.warn(`⚠️ Failed to create index ${idx.name}:`, err.message);
        }
      }
    }

    console.log('🎉 Index optimization complete!');
  } catch (err) {
    console.error('❌ Connection error:', err);
  } finally {
    if (conn) await conn.end();
  }
}

addIndexes();
