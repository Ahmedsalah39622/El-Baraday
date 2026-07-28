import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let tablesChecked = false;
async function ensureTables() {
  if (tablesChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS employee_bonus_deductions (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100),
        employee_name VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) DEFAULT 'direct_cash',
        value_hours DECIMAL(10, 2) DEFAULT 0,
        amount DECIMAL(10, 2) NOT NULL,
        month VARCHAR(50),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      SELECT bd.*, e.role as employee_role, b.name as branch_name
      FROM employee_bonus_deductions bd
      LEFT JOIN employees e ON bd.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
    `;
    const params = [];
    if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      sql += ` WHERE bd.employee_id = $1`;
    }
    sql += ` ORDER BY bd.created_at DESC`;

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
      employee_id, employee_name, type, category, value_hours, amount, month, notes
    } = body;

    const result = await query(
      `INSERT INTO employee_bonus_deductions (
        id, employee_id, employee_name, type, category, value_hours, amount, month, notes
      )
      VALUES (
        gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *`,
      [
        employee_id, employee_name, type || 'bonus', category || 'direct_cash',
        value_hours || 0, amount || 0, month || new Date().toISOString().substring(0, 7), notes || ''
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
