import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    let sql = `
      SELECT a.*, e.name as employee_name, e.role as employee_role, b.name as branch_name
      FROM employee_advances a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
    `;
    const params = [];
    if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      sql += ` WHERE a.employee_id = $1`;
    }
    sql += ` ORDER BY a.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
