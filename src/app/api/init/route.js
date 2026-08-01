import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let branchesChecked = false;
async function ensureBranchesTable() {
  if (branchesChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await query(`INSERT INTO branches (id, name) VALUES ('b1', 'فرع عزت') ON DUPLICATE KEY UPDATE name='فرع عزت'`);
    await query(`INSERT INTO branches (id, name) VALUES ('b2', 'فرع المسلة') ON DUPLICATE KEY UPDATE name='فرع المسلة'`);
  } catch(e) {}
  branchesChecked = true;
}

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

let shiftColsChecked = false;
async function ensureShiftColsTable() {
  if (shiftColsChecked) return;
  try { await query('ALTER TABLE shifts ADD COLUMN expected_amount DECIMAL(10, 2) DEFAULT 0'); } catch(e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN cash_difference DECIMAL(10, 2) DEFAULT 0'); } catch(e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN difference_type VARCHAR(50) DEFAULT \'balanced\''); } catch(e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN notes TEXT'); } catch(e) {}
  shiftColsChecked = true;
}

const safeQuery = async (sql, params = []) => {
  try {
    const res = await query(sql, params);
    if (res && Array.isArray(res.rows)) return res;
    return { rows: [] };
  } catch (e) {
    console.warn('⚠️ Safe query warning:', e.message);
    return { rows: [] };
  }
};

export async function GET(req) {
  try {
    await ensureBranchesTable();
    await ensureDriverAttendanceTable();
    await ensureInvoicesTable();
    await ensureShiftColsTable();

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

    // Active shift start_time check for order_number resetting
    let activeShiftStartTime = null;
    const sRes = await safeQuery("SELECT start_time FROM shifts WHERE status = 'active' ORDER BY start_time DESC LIMIT 1");
    if (sRes.rows && sRes.rows[0]) activeShiftStartTime = sRes.rows[0].start_time;

    let nextOrderSql = "SELECT 1 as next";
    let nextOrderParams = [];

    if (activeShiftStartTime) {
      if (branchId && branchId !== 'all') {
        nextOrderSql = "SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 as next FROM orders WHERE branch_id = $1 AND created_at >= $2";
        nextOrderParams = [branchId, activeShiftStartTime];
      } else {
        nextOrderSql = "SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 as next FROM orders WHERE created_at >= $1";
        nextOrderParams = [activeShiftStartTime];
      }
    }

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
      safeQuery('SELECT * FROM branches ORDER BY name ASC'),
      safeQuery('SELECT * FROM products ORDER BY sort_order ASC'),
      safeQuery('SELECT * FROM customers LIMIT 100'),
      safeQuery('SELECT * FROM delivery_areas ORDER BY name'),
      safeQuery(`SELECT * FROM drivers ${driversWhere} ORDER BY name`, params),
      safeQuery(`SELECT * FROM restaurant_tables ${tablesWhere} ORDER BY number`, params),
      safeQuery(nextOrderSql, nextOrderParams),
      safeQuery(`
        SELECT o.*, b.name as branch_name
        FROM orders o
        LEFT JOIN branches b ON o.branch_id = b.id
        ${ordersWhere}
        LIMIT 50
      `, params),
      safeQuery('SELECT * FROM app_settings'),
      safeQuery(`SELECT * FROM shifts ${shiftsWhere} LIMIT 20`, params),
      safeQuery(`
        SELECT da.*, d.name as driver_name, d.phone as driver_phone, b.name as branch_name
        FROM driver_attendance da
        LEFT JOIN drivers d ON da.driver_id = d.id
        LEFT JOIN branches b ON da.branch_id = b.id
        WHERE da.check_out_time IS NULL
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
