import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let driverAttendanceChecked = false;
async function ensureDriverAttendanceTable() {
  if (driverAttendanceChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS driver_attendance (
        id VARCHAR(100) PRIMARY KEY,
        driver_id VARCHAR(100),
        driver_name VARCHAR(255) NOT NULL,
        branch_id VARCHAR(100) DEFAULT 'b1',
        status VARCHAR(50) DEFAULT 'ready',
        queue_position INT DEFAULT 1,
        current_order_id VARCHAR(100),
        check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        check_out_time DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {}
  driverAttendanceChecked = true;
}

let invoicesChecked = false;
async function ensureInvoicesTable() {
  if (invoicesChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(100) PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(255) DEFAULT 'فاتورة تحصيل',
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(50) DEFAULT 'paid',
        payment_method VARCHAR(50) DEFAULT 'cash',
        invoice_date DATE NOT NULL,
        notes TEXT,
        items JSON DEFAULT NULL,
        branch_id VARCHAR(100) DEFAULT 'b1',
        created_by VARCHAR(100) DEFAULT 'administrator',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {}
  invoicesChecked = true;
}

export async function GET(req) {
  try {
    await ensureDriverAttendanceTable();
    await ensureInvoicesTable();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branch_id');

    let ordersWhere = '';
    let tablesWhere = '';
    let driversWhere = '';
    let shiftsWhere = '';
    const params = [];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      ordersWhere = `WHERE o.branch_id = $1`;
      tablesWhere = `WHERE branch_id = $1`;
      driversWhere = `WHERE branch_id = $1`;
      shiftsWhere = `WHERE branch_id = $1`;
    }

    const nextOrderSql = (branchId && branchId !== 'all')
      ? "SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 as next FROM orders WHERE branch_id = $1"
      : "SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 as next FROM orders";

    const [
      branchesRes,
      productsRes,
      customersRes,
      areasRes,
      driversRes,
      tablesRes,
      nextOrderRes,
      ordersRes,
      settingsRes,
      shiftsRes,
      attendanceRes
    ] = await Promise.all([
      query('SELECT * FROM branches ORDER BY name ASC'),
      query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC'),
      query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 100'),
      query('SELECT * FROM delivery_areas ORDER BY name'),
      query(`SELECT * FROM drivers ${driversWhere} ORDER BY name`, params),
      query(`SELECT * FROM restaurant_tables ${tablesWhere} ORDER BY number`, params),
      query(nextOrderSql, params),
      query(`
        SELECT o.*, b.name as branch_name
        FROM orders o
        LEFT JOIN branches b ON o.branch_id = b.id
        ${ordersWhere}
        ORDER BY o.created_at DESC
        LIMIT 50
      `, params),
      query('SELECT * FROM app_settings'),
      query(`SELECT * FROM shifts ${shiftsWhere} ORDER BY start_time DESC LIMIT 20`, params),
      query(`
        SELECT da.*, d.name as driver_name, d.phone as driver_phone, b.name as branch_name
        FROM driver_attendance da
        LEFT JOIN drivers d ON da.driver_id = d.id
        LEFT JOIN branches b ON da.branch_id = b.id
        WHERE da.check_out_time IS NULL
        ORDER BY da.check_in_time ASC
      `)
    ]);

    const settingsObj = {};
    if (settingsRes.rows) {
      settingsRes.rows.forEach(r => { settingsObj[r.key] = r.value; });
    }

    return NextResponse.json({
      branches: branchesRes.rows || [],
      products: productsRes.rows || [],
      customers: customersRes.rows || [],
      areas: areasRes.rows || [],
      drivers: driversRes.rows || [],
      tables: tablesRes.rows || [],
      nextOrderNumber: (nextOrderRes.rows && nextOrderRes.rows[0] && nextOrderRes.rows[0].next) ? parseInt(nextOrderRes.rows[0].next) : 1,
      orders: ordersRes.rows || [],
      settings: settingsObj,
      shifts: shiftsRes.rows || [],
      activeAttendanceQueue: attendanceRes.rows || []
    });
  } catch (error) {
    console.error('❌ Init Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
