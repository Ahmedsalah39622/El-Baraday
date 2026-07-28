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
        base_salary DECIMAL(10, 2) DEFAULT 0,
        hourly_rate DECIMAL(10, 2) DEFAULT 0,
        overtime_hours DECIMAL(10, 2) DEFAULT 0,
        overtime_amount DECIMAL(10, 2) DEFAULT 0,
        deduction_hours DECIMAL(10, 2) DEFAULT 0,
        deduction_amount DECIMAL(10, 2) DEFAULT 0,
        bonus_amount DECIMAL(10, 2) DEFAULT 0,
        direct_deductions DECIMAL(10, 2) DEFAULT 0,
        advances_amount DECIMAL(10, 2) DEFAULT 0,
        net_paid DECIMAL(10, 2) NOT NULL,
        month VARCHAR(50),
        notes TEXT,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
      employee_id, employee_name, base_salary, hourly_rate,
      overtime_hours, overtime_amount, deduction_hours, deduction_amount,
      bonus_amount, direct_deductions, advances_amount, net_paid, month, notes
    } = body;

    const result = await query(
      `INSERT INTO salary_payments (
        id, employee_id, employee_name, base_salary, hourly_rate,
        overtime_hours, overtime_amount, deduction_hours, deduction_amount,
        bonus_amount, direct_deductions, advances_amount, net_paid, month, notes
      )
      VALUES (
        gen_random_uuid()::TEXT, $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        employee_id, employee_name, base_salary || 0, hourly_rate || 0,
        overtime_hours || 0, overtime_amount || 0, deduction_hours || 0, deduction_amount || 0,
        bonus_amount || 0, direct_deductions || 0, advances_amount || 0, net_paid || 0,
        month || new Date().toISOString().substring(0, 7), notes || 'صرف مرتب شهر'
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
