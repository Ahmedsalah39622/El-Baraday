import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, role, base_salary, bonus, deductions, status } = body;
    const result = await query(
      `UPDATE employees SET name=COALESCE($1,name), phone=COALESCE($2,phone),
       role=COALESCE($3,role), base_salary=COALESCE($4,base_salary),
       bonus=COALESCE($5,bonus), deductions=COALESCE($6,deductions),
       status=COALESCE($7,status)
       WHERE id=$8 RETURNING *`,
      [name, phone, role, base_salary, bonus, deductions, status, id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM employees WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
