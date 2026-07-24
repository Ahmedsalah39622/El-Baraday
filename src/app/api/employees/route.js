import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
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
    const body = await request.json();
    const { name, phone, role, base_salary, bonus, deductions, branch_id } = body;
    const empBranch = branch_id || 'b1';

    const result = await query(
      `INSERT INTO employees (id, name, phone, role, base_salary, bonus, deductions, branch_id)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, phone, role || 'كاشير', base_salary || 0, bonus || 0, deductions || 0, empBranch]
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
