import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(
      `SELECT e.*, COALESCE(SUM(a.amount), 0)::NUMERIC as total_advances
       FROM employees e
       LEFT JOIN employee_advances a ON e.id = a.employee_id
       GROUP BY e.id ORDER BY e.name`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, role, base_salary, bonus, deductions } = body;
    const result = await query(
      `INSERT INTO employees (id, name, phone, role, base_salary, bonus, deductions)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, phone, role || 'كاشير', base_salary || 0, bonus || 0, deductions || 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
