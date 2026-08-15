import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let hourlyColumnsChecked = false;
async function ensureHourlyColumns() {
  if (hourlyColumnsChecked) return;
  try {
    await query(`ALTER TABLE employees ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN overtime_hours DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN deduction_hours DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN salary_type VARCHAR(50) DEFAULT 'monthly'`);
  } catch(e) {}
  try {
    await query(`ALTER TABLE employees ADD COLUMN weekly_rate DECIMAL(10, 2) DEFAULT 0.00`);
  } catch(e) {}
  hourlyColumnsChecked = true;
}

export async function GET(request) {
  try {
    await ensureHourlyColumns();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let sql = `
      SELECT e.*, b.name as branch_name, COALESCE(SUM(a.amount), 0)::NUMERIC as total_advances
      FROM employees e
      LEFT JOIN employee_advances a ON e.id = a.employee_id
      LEFT JOIN branches b ON e.branch_id = b.id
    `;
    const params = [];
    if (branchId && branchId !== 'all') {
      params.push(branchId);
      sql += ` WHERE e.branch_id = $1`;
    }
    sql += ` GROUP BY e.id, b.name ORDER BY e.name`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
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
      salary_type, weekly_rate
    } = body;
    const empBranch = branch_id || 'b1';
    const sType = salary_type || 'monthly';
    const wRate = parseFloat(weekly_rate || 0);

    const result = await query(
      `INSERT INTO employees (
        id, name, phone, role, base_salary, hourly_rate, 
        overtime_hours, deduction_hours, bonus, deductions, branch_id,
        salary_type, weekly_rate
      )
      VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        name, phone, role || 'كاشير', base_salary || 0, hourly_rate || 0,
        overtime_hours || 0, deduction_hours || 0, bonus || 0, deductions || 0, empBranch,
        sType, wRate
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
