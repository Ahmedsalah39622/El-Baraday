import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let hourlyColumnsChecked = false;
async function ensureHourlyColumns() {
  if (hourlyColumnsChecked) return;
  
  // 1. Ensure employees table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        role VARCHAR(100) DEFAULT 'كاشير',
        salary_type VARCHAR(50) DEFAULT 'weekly',
        weekly_rate DECIMAL(10, 2) DEFAULT 0.00,
        daily_rate DECIMAL(10, 2) DEFAULT 0.00,
        base_salary DECIMAL(10, 2) DEFAULT 0.00,
        hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
        shift_hours DECIMAL(10, 2) DEFAULT 8.00,
        work_days_per_week INT DEFAULT 6,
        shift_start_time VARCHAR(20) DEFAULT '12:00',
        grace_period_minutes INT DEFAULT 15,
        late_deduction_rate DECIMAL(10, 2) DEFAULT 1.00,
        overtime_hours DECIMAL(10, 2) DEFAULT 0.00,
        deduction_hours DECIMAL(10, 2) DEFAULT 0.00,
        bonus DECIMAL(10, 2) DEFAULT 0.00,
        deductions DECIMAL(10, 2) DEFAULT 0.00,
        branch_id VARCHAR(100) DEFAULT 'b1',
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {}

  // 2. Ensure employee_advances table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS employee_advances (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100),
        employee_name VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        is_settled TINYINT(1) DEFAULT 0,
        payment_id VARCHAR(100) DEFAULT NULL,
        month VARCHAR(50),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {}

  // 3. Ensure employee_attendance table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS employee_attendance (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        attendance_date DATE NOT NULL,
        shift_start_time VARCHAR(20) DEFAULT '12:00',
        check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        check_out_time DATETIME DEFAULT NULL,
        scheduled_hours DECIMAL(10, 2) DEFAULT 8.0,
        working_hours DECIMAL(10, 2) DEFAULT 8.0,
        late_minutes INT DEFAULT 0,
        late_hours DECIMAL(10, 2) DEFAULT 0.0,
        overtime_hours DECIMAL(10, 2) DEFAULT 0.0,
        status VARCHAR(50) DEFAULT 'present',
        is_paid TINYINT(1) DEFAULT 0,
        payment_id VARCHAR(100) DEFAULT NULL,
        branch_id VARCHAR(100) DEFAULT 'b1',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {}

  // 4. Safe Alter columns
  try { await query(`ALTER TABLE employees ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT 0.00`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN overtime_hours DECIMAL(10, 2) DEFAULT 0.00`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN deduction_hours DECIMAL(10, 2) DEFAULT 0.00`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN salary_type VARCHAR(50) DEFAULT 'weekly'`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN weekly_rate DECIMAL(10, 2) DEFAULT 0.00`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN daily_rate DECIMAL(10, 2) DEFAULT 0.00`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN shift_hours DECIMAL(10, 2) DEFAULT 8.00`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN work_days_per_week INT DEFAULT 6`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN shift_start_time VARCHAR(20) DEFAULT '12:00'`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN grace_period_minutes INT DEFAULT 15`); } catch(e) {}
  try { await query(`ALTER TABLE employees ADD COLUMN late_deduction_rate DECIMAL(10, 2) DEFAULT 1.00`); } catch(e) {}
  try { await query(`ALTER TABLE employee_advances ADD COLUMN is_settled TINYINT(1) DEFAULT 0`); } catch(e) {}
  try { await query(`ALTER TABLE employee_advances ADD COLUMN payment_id VARCHAR(100) DEFAULT NULL`); } catch(e) {}
  try { await query(`ALTER TABLE employee_attendance ADD COLUMN is_paid TINYINT(1) DEFAULT 0`); } catch(e) {}
  try { await query(`ALTER TABLE employee_attendance ADD COLUMN payment_id VARCHAR(100) DEFAULT NULL`); } catch(e) {}

  hourlyColumnsChecked = true;
}

export async function GET(request) {
  try {
    await ensureHourlyColumns();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let sql = `
      SELECT 
        e.*, 
        b.name as branch_name, 
        (SELECT COALESCE(SUM(a.amount), 0) FROM employee_advances a WHERE a.employee_id = e.id AND (a.is_settled = 0 OR a.is_settled IS NULL)) as total_advances,
        (SELECT COUNT(DISTINCT ea.attendance_date) FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.is_paid = 0) as unpaid_days_count,
        (SELECT COALESCE(SUM(ea.working_hours), 0) FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.is_paid = 0) as unpaid_working_hours,
        (SELECT COALESCE(SUM(ea.late_hours), 0) FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.is_paid = 0) as unpaid_late_hours,
        (SELECT COALESCE(SUM(ea.late_minutes), 0) FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.is_paid = 0) as unpaid_late_minutes,
        (SELECT COALESCE(SUM(ea.overtime_hours), 0) FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.is_paid = 0) as unpaid_overtime_hours,
        (SELECT COUNT(*) FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.check_out_time IS NULL) as is_clocked_in,
        (SELECT ea.check_in_time FROM employee_attendance ea WHERE ea.employee_id = e.id AND ea.check_out_time IS NULL ORDER BY ea.check_in_time DESC LIMIT 1) as current_check_in_time
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
    `;
    const params = [];
    if (branchId && branchId !== 'all') {
      params.push(branchId);
      sql += ` WHERE e.branch_id = $1`;
    }
    sql += ` ORDER BY e.name ASC`;

    try {
      const result = await query(sql, params);
      return NextResponse.json(result.rows || []);
    } catch (queryErr) {
      console.warn('⚠️ Enriched query fallback:', queryErr.message);
      // Resilient fallback query in case any subquery failed
      let fallbackSql = `SELECT e.*, b.name as branch_name FROM employees e LEFT JOIN branches b ON e.branch_id = b.id`;
      const fbParams = [];
      if (branchId && branchId !== 'all') {
        fbParams.push(branchId);
        fallbackSql += ` WHERE e.branch_id = $1`;
      }
      fallbackSql += ` ORDER BY e.name ASC`;
      const fallbackResult = await query(fallbackSql, fbParams);
      return NextResponse.json(fallbackResult.rows || []);
    }
  } catch (error) {
    console.error('❌ Error in /api/employees GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureHourlyColumns();
    const body = await request.json();
    const { 
      name, phone, role, base_salary, hourly_rate, 
      overtime_hours, deduction_hours, bonus, deductions, branch_id,
      salary_type, weekly_rate, daily_rate, shift_hours, work_days_per_week,
      shift_start_time, grace_period_minutes, late_deduction_rate
    } = body;
    const empBranch = branch_id || 'b1';
    const sType = salary_type || 'weekly';
    const wRate = parseFloat(weekly_rate || 0);
    const workDays = parseInt(work_days_per_week || 6);
    const sHours = parseFloat(shift_hours || 8.0);
    const dRate = parseFloat(daily_rate || (sType === 'weekly' && wRate > 0 ? (wRate / workDays) : 0));
    const hRate = parseFloat(hourly_rate || (dRate > 0 ? (dRate / sHours) : 0));
    const bSalary = parseFloat(base_salary || (sType === 'weekly' ? (wRate * 4) : 0));

    const result = await query(
      `INSERT INTO employees (
        id, name, phone, role, base_salary, hourly_rate, 
        overtime_hours, deduction_hours, bonus, deductions, branch_id,
        salary_type, weekly_rate, daily_rate, shift_hours, work_days_per_week,
        shift_start_time, grace_period_minutes, late_deduction_rate
      )
      VALUES (
        gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18
      ) RETURNING *`,
      [
        name, phone, role || 'كاشير', bSalary, hRate,
        overtime_hours || 0, deduction_hours || 0, bonus || 0, deductions || 0, empBranch,
        sType, wRate, dRate, sHours, workDays,
        shift_start_time || '12:00', parseInt(grace_period_minutes || 15), parseFloat(late_deduction_rate || 1.0)
      ]
    );

    const newEmp = result.rows[0];

    // If role is delivery driver, automatically register in drivers table as well
    if (role && (role.includes('طيار') || role.toLowerCase().includes('driver') || role.includes('دليفري'))) {
      await query(
        `INSERT INTO drivers (id, name, phone, status, branch_id)
         VALUES (gen_random_uuid()::TEXT, $1, $2, 'active', $3)`,
        [name, phone || '', empBranch]
      );
    }

    return NextResponse.json(newEmp, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

