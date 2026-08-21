import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let tablesChecked = false;
async function ensureAttendanceTables() {
  if (tablesChecked) return;
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

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS employee_attendance (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        branch_id VARCHAR(100) DEFAULT 'b1',
        attendance_date DATE NOT NULL,
        check_in_time DATETIME NOT NULL,
        check_out_time DATETIME DEFAULT NULL,
        shift_start_time VARCHAR(20) DEFAULT '12:00',
        scheduled_hours DECIMAL(10, 2) DEFAULT 8.00,
        late_minutes INT DEFAULT 0,
        late_hours DECIMAL(10, 2) DEFAULT 0.00,
        working_hours DECIMAL(10, 2) DEFAULT 0.00,
        overtime_hours DECIMAL(10, 2) DEFAULT 0.00,
        day_fraction DECIMAL(10, 2) DEFAULT 1.00,
        status VARCHAR(50) DEFAULT 'present',
        is_paid TINYINT(1) DEFAULT 0,
        payment_id VARCHAR(100) DEFAULT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emp_paid (employee_id, is_paid),
        INDEX idx_att_date (attendance_date),
        INDEX idx_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {}

  try {
    await query(`ALTER TABLE employees ADD COLUMN shift_start_time VARCHAR(20) DEFAULT '12:00'`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN shift_hours DECIMAL(10, 2) DEFAULT 8.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN grace_period_minutes INT DEFAULT 15`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN work_days_per_week INT DEFAULT 6`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN daily_rate DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}

  tablesChecked = true;
}

function calculateLateness(checkInDate, shiftStartTimeStr = '12:00', graceMinutes = 15) {
  try {
    const checkIn = new Date(checkInDate);
    const parts = (shiftStartTimeStr || '12:00').trim().split(':');
    let shiftHour = parseInt(parts[0], 10) || 12;
    let shiftMinute = parseInt(parts[1] || '0', 10) || 0;

    const shiftDate = new Date(checkIn);
    shiftDate.setHours(shiftHour, shiftMinute, 0, 0);

    const graceMs = (graceMinutes || 15) * 60 * 1000;
    const diffMs = checkIn.getTime() - shiftDate.getTime();

    if (diffMs > graceMs) {
      const lateMinutes = Math.floor(diffMs / (60 * 1000));
      const lateHours = parseFloat((lateMinutes / 60).toFixed(2));
      return { lateMinutes, lateHours };
    }
    return { lateMinutes: 0, lateHours: 0 };
  } catch (e) {
    return { lateMinutes: 0, lateHours: 0 };
  }
}

export async function GET(req) {
  try {
    await ensureAttendanceTables();

    // 1. Sync delivery drivers
    try {
      const deliveryEmployees = await query(
        `SELECT name, phone, branch_id FROM employees 
         WHERE role LIKE '%طيار%' OR role LIKE '%دليفري%' OR LOWER(role) LIKE '%driver%'`
      );
      for (const emp of (deliveryEmployees.rows || [])) {
        let dCheck = await query(`SELECT id, name, phone, branch_id FROM drivers WHERE name = $1`, [emp.name]);
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

    // 2. Self healing delivery status
    try {
      await query(`
        UPDATE driver_attendance da
        SET status = 'ready', current_order_id = NULL, check_in_time = CURRENT_TIMESTAMP
        WHERE da.check_out_time IS NULL
        AND da.status = 'on_delivery'
        AND (
          da.current_order_id IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = da.current_order_id
            AND o.status IN ('preparing', 'dispatched', 'out_for_delivery', 'ready_for_pickup')
          )
        )
      `);
    } catch (e) {}

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branch_id');
    const dateParam = searchParams.get('date');

    // 3. Driver Active Queue
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
      sql += ` AND (da.branch_id = $${params.length} OR da.branch_id IS NULL OR da.branch_id = '' OR da.branch_id = 'all')`;
    }
    sql += ` ORDER BY da.check_in_time ASC`;
    const activeQueueRes = await query(sql, params);

    // 4. All Drivers List
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
      driversSql += ` WHERE (d.branch_id = $${driversParams.length} OR d.branch_id IS NULL OR d.branch_id = '' OR d.branch_id = 'all')`;
    }
    driversSql += ` ORDER BY d.name ASC`;
    const driversRes = await query(driversSql, driversParams);

    // 5. Today's Employee Attendance Records
    let todaySql = `
      SELECT ea.*, e.role as employee_role, e.salary_type, e.weekly_rate, e.daily_rate, e.hourly_rate, b.name as branch_name
      FROM employee_attendance ea
      LEFT JOIN employees e ON ea.employee_id = e.id
      LEFT JOIN branches b ON ea.branch_id = b.id
      WHERE DATE(ea.attendance_date) = ${dateParam ? '$1' : 'CURRENT_DATE()'}
    `;
    const todayParams = dateParam ? [dateParam] : [];
    if (branchId && branchId !== 'all') {
      todayParams.push(branchId);
      todaySql += ` AND (ea.branch_id = $${todayParams.length} OR ea.branch_id IS NULL OR ea.branch_id = '' OR ea.branch_id = 'all')`;
    }
    todaySql += ` ORDER BY ea.check_in_time DESC`;
    const todayRes = await query(todaySql, todayParams);

    // 6. Aggregated Unpaid Cycle Attendance for each Employee
    let unpaidSummarySql = `
      SELECT 
        employee_id,
        COUNT(DISTINCT attendance_date) as days_attended,
        COALESCE(SUM(working_hours), 0) as total_working_hours,
        COALESCE(SUM(late_hours), 0) as total_late_hours,
        COALESCE(SUM(late_minutes), 0) as total_late_minutes,
        COALESCE(SUM(overtime_hours), 0) as total_overtime_hours,
        MAX(check_in_time) as last_check_in
      FROM employee_attendance
      WHERE is_paid = 0
      GROUP BY employee_id
    `;
    const unpaidSummaryRes = await query(unpaidSummarySql);

    // 7. Recent 50 Attendance Logs (for HR log review)
    let recentSql = `
      SELECT ea.*, e.role as employee_role, b.name as branch_name
      FROM employee_attendance ea
      LEFT JOIN employees e ON ea.employee_id = e.id
      LEFT JOIN branches b ON ea.branch_id = b.id
      ORDER BY ea.check_in_time DESC
      LIMIT 100
    `;
    const recentRes = await query(recentSql);

    return NextResponse.json({
      activeQueue: activeQueueRes.rows || [],
      allDrivers: driversRes.rows || [],
      todayAttendance: todayRes.rows || [],
      unpaidSummary: unpaidSummaryRes.rows || [],
      recentAttendanceLogs: recentRes.rows || []
    });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureAttendanceTables();
    const body = await req.json();
    const {
      driver_id, staff_id, employee_id, driver_name, employee_name, branch_id, action,
      attendance_id, is_driver, check_in_time, check_out_time, attendance_date,
      shift_start_time, scheduled_hours, late_minutes, late_hours, working_hours, notes
    } = body;

    const targetStaffId = staff_id || employee_id || driver_id;
    let targetName = driver_name || employee_name;

    // Fetch employee details if available
    let empRecord = null;
    if (targetStaffId) {
      const empRes = await query(`SELECT * FROM employees WHERE id = $1`, [targetStaffId]);
      if (empRes.rows && empRes.rows.length > 0) {
        empRecord = empRes.rows[0];
        if (!targetName) targetName = empRecord.name;
      }
    }

    const empBranch = branch_id || empRecord?.branch_id || 'b1';
    const now = new Date();

    // ==========================================
    // ACTION: CHECK-IN (تسجيل تمام الحضور)
    // ==========================================
    if (action === 'check_in') {
      if (!targetStaffId && !targetName) {
        return NextResponse.json({ error: 'مُعرف الموظف مطلوب' }, { status: 400 });
      }

      const scheduledStart = shift_start_time || empRecord?.shift_start_time || '12:00';
      const scheduledH = parseFloat(scheduled_hours || empRecord?.shift_hours || 8.0);
      const graceM = parseInt(empRecord?.grace_period_minutes || 15);

      const checkInDateObj = check_in_time ? new Date(check_in_time) : now;
      const attDate = attendance_date || checkInDateObj.toISOString().split('T')[0];

      // Calculate Lateness
      let computedLateMinutes = late_minutes !== undefined ? parseInt(late_minutes) : null;
      let computedLateHours = late_hours !== undefined ? parseFloat(late_hours) : null;

      if (computedLateMinutes === null || computedLateHours === null) {
        const lateness = calculateLateness(checkInDateObj, scheduledStart, graceM);
        computedLateMinutes = lateness.lateMinutes;
        computedLateHours = lateness.lateHours;
      }

      // Check if there is already an open session today for this employee
      const openSessionCheck = await query(
        `SELECT id FROM employee_attendance 
         WHERE employee_id = $1 AND attendance_date = $2 AND check_out_time IS NULL`,
        [targetStaffId, attDate]
      );

      let attRecord = null;
      if (openSessionCheck.rows && openSessionCheck.rows.length > 0) {
        // Update existing open session
        const upd = await query(
          `UPDATE employee_attendance SET 
            check_in_time = $1,
            shift_start_time = $2,
            scheduled_hours = $3,
            late_minutes = $4,
            late_hours = $5,
            notes = COALESCE($6, notes)
           WHERE id = $7 RETURNING *`,
          [
            checkInDateObj, scheduledStart, scheduledH,
            computedLateMinutes, computedLateHours, notes || null,
            openSessionCheck.rows[0].id
          ]
        );
        attRecord = upd.rows[0];
      } else {
        // Insert new attendance session
        const ins = await query(
          `INSERT INTO employee_attendance (
            id, employee_id, employee_name, branch_id, attendance_date,
            check_in_time, shift_start_time, scheduled_hours,
            late_minutes, late_hours, working_hours, overtime_hours,
            day_fraction, status, is_paid, notes
          ) VALUES (
            gen_random_uuid()::TEXT, $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, 0.00, 0.00,
            1.00, $10, 0, $11
          ) RETURNING *`,
          [
            targetStaffId, targetName || 'موظف', empBranch, attDate,
            checkInDateObj, scheduledStart, scheduledH,
            computedLateMinutes, computedLateHours,
            computedLateMinutes > 0 ? 'late' : 'present', notes || null
          ]
        );
        attRecord = ins.rows[0];
      }

      // Update employee status to active
      await query(`UPDATE employees SET status = 'active' WHERE id = $1`, [targetStaffId]);

      // If Driver, manage driver_attendance for delivery queue
      let isDriver = is_driver;
      if (isDriver === undefined && (empRecord?.role?.includes('طيار') || empRecord?.role?.includes('دليفري') || empRecord?.role?.toLowerCase()?.includes('driver'))) {
        isDriver = true;
      }

      let driverRecord = null;
      if (isDriver) {
        const existingDriverQueue = await query(
          `SELECT * FROM driver_attendance WHERE (driver_id = $1 OR driver_name = $2) AND check_out_time IS NULL`,
          [driver_id || targetStaffId, targetName]
        );

        if (existingDriverQueue.rows && existingDriverQueue.rows.length > 0) {
          const updDriver = await query(
            `UPDATE driver_attendance SET status = 'ready' WHERE id = $1 RETURNING *`,
            [existingDriverQueue.rows[0].id]
          );
          driverRecord = updDriver.rows[0];
        } else {
          const queueRes = await query(
            `SELECT COUNT(*) as pos FROM driver_attendance WHERE check_out_time IS NULL AND branch_id = $1`,
            [empBranch]
          );
          const nextPos = (parseInt(queueRes.rows[0]?.pos || 0)) + 1;
          const insDriver = await query(
            `INSERT INTO driver_attendance (id, driver_id, driver_name, branch_id, status, queue_position, check_in_time)
             VALUES (gen_random_uuid()::TEXT, $1, $2, $3, 'ready', $4, $5) RETURNING *`,
            [driver_id || targetStaffId, targetName || 'طيار', empBranch, nextPos, checkInDateObj]
          );
          driverRecord = insDriver.rows[0];
        }
      }

      return NextResponse.json({
        message: computedLateMinutes > 0 
          ? `تم تسجيل تمام الحضور بنجاح (تأخير ${computedLateMinutes} دقيقة)` 
          : 'تم تسجيل تمام الحضور في الميعاد بنجاح 🟢',
        attendance: attRecord,
        driverRecord,
        lateMinutes: computedLateMinutes,
        lateHours: computedLateHours
      });
    }

    // ==========================================
    // ACTION: CHECK-OUT (تسجيل الانصراف وحساب الساعات)
    // ==========================================
    if (action === 'check_out') {
      const checkOutDateObj = check_out_time ? new Date(check_out_time) : now;

      // 1. Look up active open session in employee_attendance
      let targetAttId = attendance_id;
      if (!targetAttId && targetStaffId) {
        const openCheck = await query(
          `SELECT * FROM employee_attendance 
           WHERE employee_id = $1 AND check_out_time IS NULL
           ORDER BY check_in_time DESC LIMIT 1`,
          [targetStaffId]
        );
        if (openCheck.rows && openCheck.rows.length > 0) {
          targetAttId = openCheck.rows[0].id;
        }
      }

      let updatedAtt = null;
      if (targetAttId) {
        const attRes = await query(`SELECT * FROM employee_attendance WHERE id = $1`, [targetAttId]);
        if (attRes.rows && attRes.rows.length > 0) {
          const att = attRes.rows[0];
          const checkInTime = new Date(att.check_in_time);
          const diffHours = Math.max(0, (checkOutDateObj.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));
          const actualWorkingHours = working_hours !== undefined ? parseFloat(working_hours) : parseFloat(diffHours.toFixed(2));
          const scheduledH = parseFloat(att.scheduled_hours || 8.0);
          const overtimeH = actualWorkingHours > scheduledH ? parseFloat((actualWorkingHours - scheduledH).toFixed(2)) : 0.00;
          const dayFraction = actualWorkingHours >= (scheduledH * 0.75) ? 1.00 : parseFloat((actualWorkingHours / scheduledH).toFixed(2));

          const upd = await query(
            `UPDATE employee_attendance SET 
              check_out_time = $1,
              working_hours = $2,
              overtime_hours = $3,
              day_fraction = $4,
              status = 'completed',
              notes = COALESCE($5, notes)
             WHERE id = $6 RETURNING *`,
            [checkOutDateObj, actualWorkingHours, overtimeH, dayFraction, notes || null, targetAttId]
          );
          updatedAtt = upd.rows[0];
        }
      }

      // 2. Mark driver offline if in driver_attendance
      if (targetStaffId || targetName) {
        await query(
          `UPDATE driver_attendance SET check_out_time = $1, status = 'offline' 
           WHERE (driver_id = $2 OR driver_name = $3) AND check_out_time IS NULL`,
          [checkOutDateObj, targetStaffId || '', targetName || '']
        );
      }

      // 3. Mark employee inactive
      if (targetStaffId) {
        await query(`UPDATE employees SET status = 'inactive' WHERE id = $1`, [targetStaffId]);
      }

      return NextResponse.json({
        message: 'تم تسجيل الانصراف وحساب ساعات العمل بنجاح',
        attendance: updatedAtt
      });
    }

    // ==========================================
    // ACTION: MANUAL ATTENDANCE (تسجيل / تعديل حضور يدوي لـ HR)
    // ==========================================
    if (action === 'manual_attendance') {
      if (!targetStaffId) {
        return NextResponse.json({ error: 'الموظف مطلوب' }, { status: 400 });
      }

      const attDate = attendance_date || now.toISOString().split('T')[0];
      const scheduledStart = shift_start_time || empRecord?.shift_start_time || '12:00';
      const scheduledH = parseFloat(scheduled_hours || empRecord?.shift_hours || 8.0);
      const wHours = parseFloat(working_hours || scheduledH);
      const lMinutes = parseInt(late_minutes || 0);
      const lHours = parseFloat(late_hours || (lMinutes > 0 ? (lMinutes / 60).toFixed(2) : 0));
      const oHours = wHours > scheduledH ? parseFloat((wHours - scheduledH).toFixed(2)) : 0.00;

      let cIn = check_in_time ? new Date(check_in_time) : new Date(`${attDate}T${scheduledStart}:00`);
      let cOut = check_out_time ? new Date(check_out_time) : new Date(cIn.getTime() + (wHours * 60 * 60 * 1000));

      if (attendance_id) {
        // Edit existing record
        const upd = await query(
          `UPDATE employee_attendance SET 
            attendance_date = $1,
            check_in_time = $2,
            check_out_time = $3,
            shift_start_time = $4,
            scheduled_hours = $5,
            working_hours = $6,
            late_minutes = $7,
            late_hours = $8,
            overtime_hours = $9,
            notes = $10,
            status = 'completed'
           WHERE id = $11 RETURNING *`,
          [attDate, cIn, cOut, scheduledStart, scheduledH, wHours, lMinutes, lHours, oHours, notes || 'تسجيل يدوي من الإدارة', attendance_id]
        );
        return NextResponse.json({ message: 'تم تحديث التمام بنجاح', record: upd.rows[0] });
      } else {
        // Insert new record
        const ins = await query(
          `INSERT INTO employee_attendance (
            id, employee_id, employee_name, branch_id, attendance_date,
            check_in_time, check_out_time, shift_start_time, scheduled_hours,
            working_hours, late_minutes, late_hours, overtime_hours,
            day_fraction, status, is_paid, notes
          ) VALUES (
            gen_random_uuid()::TEXT, $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12,
            1.00, 'completed', 0, $13
          ) RETURNING *`,
          [
            targetStaffId, targetName || empRecord?.name || 'موظف', empBranch, attDate,
            cIn, cOut, scheduledStart, scheduledH,
            wHours, lMinutes, lHours, oHours, notes || 'تسجيل يدوي من الإدارة'
          ]
        );
        return NextResponse.json({ message: 'تم إضافة تمام الحضور اليدوي بنجاح', record: ins.rows[0] });
      }
    }

    // ==========================================
    // ACTION: DELETE ATTENDANCE (حذف تمام)
    // ==========================================
    if (action === 'delete_attendance') {
      if (!attendance_id) {
        return NextResponse.json({ error: 'رقم التمام مطلوب' }, { status: 400 });
      }
      await query(`DELETE FROM employee_attendance WHERE id = $1`, [attendance_id]);
      return NextResponse.json({ message: 'تم حذف التمام بنجاح' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Error in attendance POST:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
