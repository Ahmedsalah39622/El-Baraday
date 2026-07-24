import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
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
          `UPDATE employees SET status = 'active' WHERE (id = $1 OR name = $2 OR name ILIKE $2)`,
          [targetId || '', driver_name || '']
        );
      }

      return NextResponse.json({ message: 'تم تسجيل تمام الحضور بنجاح', record: driverRecord });
    }

    // Action: Check-out (انصراف / مغادرة)
    if (action === 'check_out') {
      if (attendance_id || driver_id) {
        const targetId = attendance_id || (driver_id ? (await query(`SELECT id FROM driver_attendance WHERE (driver_id = $1 OR driver_name = $2) AND check_out_time IS NULL`, [driver_id, driver_name || ''])).rows[0]?.id : null);
        if (targetId) {
          await query(
            `UPDATE driver_attendance SET check_out_time = CURRENT_TIMESTAMP, status = 'offline' WHERE id = $1 RETURNING *`,
            [targetId]
          );
        }
      }

      if (staff_id || driver_name || driver_id) {
        await query(
          `UPDATE employees SET status = 'inactive' WHERE (id = $1 OR name = $2 OR name ILIKE $2)`,
          [staff_id || driver_id || '', driver_name || '']
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
