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

export async function GET(req) {
  try {
    await ensureDriverAttendanceTable();

    // SELF-HEALING: Sync and update drivers from employees table
    try {
      const deliveryEmployees = await query(
        `SELECT name, phone, branch_id FROM employees 
         WHERE role LIKE '%طيار%' OR role LIKE '%دليفري%' OR LOWER(role) LIKE '%driver%'`
      );
      for (const emp of (deliveryEmployees.rows || [])) {
        let dCheck = { rows: [] };
        dCheck = await query(`SELECT id, name, phone, branch_id FROM drivers WHERE name = $1`, [emp.name]);
        if (dCheck.rows.length === 0 && emp.phone && emp.phone.trim() !== '') {
          dCheck = await query(`SELECT id, name, phone, branch_id FROM drivers WHERE phone = $1`, [emp.phone]);
        }

        if (dCheck.rows && dCheck.rows.length > 0) {
          const existingDriver = dCheck.rows[0];
          if (existingDriver.name !== emp.name || existingDriver.phone !== emp.phone || existingDriver.branch_id !== emp.branch_id) {
            await query(
              `UPDATE drivers SET name = $1, phone = $2, branch_id = $3 WHERE id = $4`,
              [emp.name, emp.phone || '', emp.branch_id || 'b1', existingDriver.id]
            );
          }
        } else {
          await query(
            `INSERT INTO drivers (id, name, phone, status, branch_id)
             VALUES (gen_random_uuid()::TEXT, $1, $2, 'active', $3)`,
            [emp.name, emp.phone || '', emp.branch_id || 'b1']
          );
        }
      }
    } catch (err) {
      console.error('Error syncing delivery employees to drivers:', err);
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branch_id');

    let sql = `
      SELECT da.*, d.phone as driver_phone, b.name as branch_name
      FROM driver_attendance da
      LEFT JOIN drivers d ON da.driver_id = d.id
      LEFT JOIN branches b ON da.branch_id = b.id
      WHERE da.check_out_time IS NULL
    `;
    const params = [];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      sql += ` AND da.branch_id = $${params.length}`;
    }

    sql += ` ORDER BY da.check_in_time ASC`;

    const res = await query(sql, params);

    // Also get list of all registered drivers with their active check-in state
    let driversSql = `
      SELECT d.*, b.name as branch_name,
             (SELECT id FROM driver_attendance WHERE driver_id = d.id AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1) as active_attendance_id,
             (SELECT status FROM driver_attendance WHERE driver_id = d.id AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1) as attendance_status,
             (SELECT check_in_time FROM driver_attendance WHERE driver_id = d.id AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1) as check_in_time
      FROM drivers d
      LEFT JOIN branches b ON d.branch_id = b.id
    `;
    const driversParams = [];
    if (branchId && branchId !== 'all') {
      driversParams.push(branchId);
      driversSql += ` WHERE d.branch_id = $${driversParams.length}`;
    }
    driversSql += ` ORDER BY d.name ASC`;

    const driversRes = await query(driversSql, driversParams);

    return NextResponse.json({
      activeQueue: res.rows || [],
      allDrivers: driversRes.rows || []
    });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { driver_id, staff_id, driver_name, branch_id, action, attendance_id, is_driver } = body;

    // Action: Check-in (تسجيل تمام / حضور الموظف أو الطيار)
    if (action === 'check_in') {
      const targetId = driver_id || staff_id;
      if (!targetId && !driver_name) {
        return NextResponse.json({ error: 'مُعرف الموظف أو الطيار مطلوب' }, { status: 400 });
      }

      let isDriver = is_driver;
      if (isDriver === undefined && targetId) {
        const dCheck = await query(`SELECT id FROM drivers WHERE id = $1 OR name = $2`, [targetId, driver_name || '']);
        isDriver = dCheck.rows && dCheck.rows.length > 0;
      }

      let driverRecord = null;

      // 1. If Driver -> Manage driver_attendance table for queue
      if (isDriver || driver_id) {
        const existing = await query(
          `SELECT * FROM driver_attendance WHERE (driver_id = $1 OR driver_name = $2) AND check_out_time IS NULL`,
          [driver_id || targetId, driver_name || '']
        );

        if (existing.rows && existing.rows.length > 0) {
          const updated = await query(
            `UPDATE driver_attendance SET status = 'ready' WHERE id = $1 RETURNING *`,
            [existing.rows[0].id]
          );
          driverRecord = updated.rows[0];
        } else {
          const queueRes = await query(
            `SELECT COUNT(*) as pos FROM driver_attendance WHERE check_out_time IS NULL AND branch_id = $1`,
            [branch_id || 'b1']
          );
          const nextPos = (parseInt(queueRes.rows[0]?.pos || 0)) + 1;

          const res = await query(
            `INSERT INTO driver_attendance (driver_id, driver_name, branch_id, status, queue_position, check_in_time)
             VALUES ($1, $2, $3, 'ready', $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [driver_id || targetId, driver_name || 'طيار', branch_id || 'b1', nextPos]
          );
          driverRecord = res.rows[0];
        }
      }

      // 2. Always update employee status in employees table if exists
      if (driver_name || targetId) {
        await query(
          `UPDATE employees SET status = 'active' WHERE id = $1 OR name = $2`,
          [targetId || '', driver_name || '']
        );
      }

      return NextResponse.json({ message: 'تم تسجيل تمام الحضور بنجاح', record: driverRecord });
    }

    // Action: Check-out (انصراف / مغادرة)
    if (action === 'check_out') {
      const targetStaffId = staff_id || driver_id || '';
      const targetName = driver_name || '';

      // 1. Mark driver_attendance offline
      if (attendance_id) {
        await query(
          `UPDATE driver_attendance SET check_out_time = CURRENT_TIMESTAMP, status = 'offline' WHERE id = $1`,
          [attendance_id]
        );
      }
      if (targetStaffId || targetName) {
        await query(
          `UPDATE driver_attendance SET check_out_time = CURRENT_TIMESTAMP, status = 'offline' WHERE (driver_id = $1 OR driver_name = $2) AND check_out_time IS NULL`,
          [targetStaffId || '', targetName || '']
        );
      }

      // 2. Mark employee status inactive
      if (targetStaffId || targetName) {
        await query(
          `UPDATE employees SET status = 'inactive' WHERE id = $1 OR name = $2`,
          [targetStaffId || '', targetName || '']
        );
      }

      return NextResponse.json({ message: 'تم تسجيل الانصراف بنجاح' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Error in attendance POST:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
