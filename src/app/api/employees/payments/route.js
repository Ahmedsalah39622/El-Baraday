import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let tablesChecked = false;
async function ensureTables() {
  if (tablesChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS salary_payments (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100),
        employee_name VARCHAR(255),
        salary_type VARCHAR(50) DEFAULT 'weekly',
        base_salary DECIMAL(10, 2) DEFAULT 0,
        hourly_rate DECIMAL(10, 2) DEFAULT 0,
        daily_rate DECIMAL(10, 2) DEFAULT 0,
        days_attended DECIMAL(10, 2) DEFAULT 0,
        hours_worked DECIMAL(10, 2) DEFAULT 0,
        late_hours DECIMAL(10, 2) DEFAULT 0,
        late_deduction_amount DECIMAL(10, 2) DEFAULT 0,
        earned_amount DECIMAL(10, 2) DEFAULT 0,
        overtime_hours DECIMAL(10, 2) DEFAULT 0,
        overtime_amount DECIMAL(10, 2) DEFAULT 0,
        deduction_hours DECIMAL(10, 2) DEFAULT 0,
        deduction_amount DECIMAL(10, 2) DEFAULT 0,
        bonus_amount DECIMAL(10, 2) DEFAULT 0,
        direct_deductions DECIMAL(10, 2) DEFAULT 0,
        advances_amount DECIMAL(10, 2) DEFAULT 0,
        net_paid DECIMAL(10, 2) NOT NULL,
        period_start DATE,
        period_end DATE,
        month VARCHAR(50),
        notes TEXT,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch(e) {}

  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN salary_type VARCHAR(50) DEFAULT 'weekly'`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN daily_rate DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN days_attended DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN hours_worked DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN late_hours DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN late_deduction_amount DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN earned_amount DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN period_start DATE`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE salary_payments ADD COLUMN period_end DATE`);
  } catch(e) {}

  try {
    await query(`ALTER TABLE employee_advances ADD COLUMN is_settled TINYINT(1) DEFAULT 0`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employee_advances ADD COLUMN payment_id VARCHAR(100) DEFAULT NULL`);
  } catch(e) {}

  tablesChecked = true;
}

export async function GET(request) {
  try {
    await ensureTables();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    let sql = `
      SELECT p.*, e.role as employee_role, b.name as branch_name
      FROM salary_payments p
      LEFT JOIN employees e ON p.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
    `;
    const params = [];
    if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      sql += ` WHERE p.employee_id = $1`;
    }
    sql += ` ORDER BY p.payment_date DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTables();
    const body = await request.json();
    const {
      employee_id, employee_name, salary_type, base_salary, hourly_rate, daily_rate,
      days_attended, hours_worked, late_hours, late_deduction_amount, earned_amount,
      overtime_hours, overtime_amount, deduction_hours, deduction_amount,
      bonus_amount, direct_deductions, advances_amount, net_paid,
      period_start, period_end, month, notes
    } = body;

    const result = await query(
      `INSERT INTO salary_payments (
        id, employee_id, employee_name, salary_type, base_salary, hourly_rate, daily_rate,
        days_attended, hours_worked, late_hours, late_deduction_amount, earned_amount,
        overtime_hours, overtime_amount, deduction_hours, deduction_amount,
        bonus_amount, direct_deductions, advances_amount, net_paid,
        period_start, period_end, month, notes, payment_date
      )
      VALUES (
        gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        employee_id, employee_name, salary_type || 'weekly', base_salary || 0, hourly_rate || 0, daily_rate || 0,
        days_attended || 0, hours_worked || 0, late_hours || 0, late_deduction_amount || 0, earned_amount || 0,
        overtime_hours || 0, overtime_amount || 0, deduction_hours || 0, deduction_amount || 0,
        bonus_amount || 0, direct_deductions || 0, advances_amount || 0, net_paid || 0,
        period_start || null, period_end || null, month || new Date().toISOString().substring(0, 7), notes || 'صرف وتصفية مستحقات الأسبوع'
      ]
    );

    const paymentRecord = result.rows[0];
    const paymentId = paymentRecord.id;

    // 1. Settle all unpaid attendance records for this employee
    if (employee_id) {
      await query(
        `UPDATE employee_attendance SET is_paid = 1, payment_id = $1 
         WHERE employee_id = $2 AND is_paid = 0`,
        [paymentId, employee_id]
      );

      // 2. Settle all unpaid advances for this employee
      await query(
        `UPDATE employee_advances SET is_settled = 1, payment_id = $1 
         WHERE employee_id = $2 AND (is_settled = 0 OR is_settled IS NULL)`,
        [paymentId, employee_id]
      );

      // 3. Reset employee status to active / reset temporary cycle fields
      await query(
        `UPDATE employees SET 
          overtime_hours = 0,
          deduction_hours = 0,
          bonus = 0,
          deductions = 0,
          status = 'active'
         WHERE id = $1`,
        [employee_id]
      );
    }

    return NextResponse.json(paymentRecord, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

