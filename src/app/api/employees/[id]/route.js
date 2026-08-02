import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, phone, role, base_salary, hourly_rate, 
      overtime_hours, deduction_hours, bonus, deductions, status, branch_id 
    } = body;

    const result = await query(
      `UPDATE employees SET 
        name=COALESCE($1,name), 
        phone=COALESCE($2,phone),
        role=COALESCE($3,role), 
        base_salary=COALESCE($4,base_salary),
        hourly_rate=COALESCE($5,hourly_rate),
        overtime_hours=COALESCE($6,overtime_hours),
        deduction_hours=COALESCE($7,deduction_hours),
        bonus=COALESCE($8,bonus), 
        deductions=COALESCE($9,deductions),
        status=COALESCE($10,status), 
        branch_id=COALESCE($11,branch_id)
       WHERE id=$12 RETURNING *`,
      [
        name, phone, role, base_salary, hourly_rate, 
        overtime_hours, deduction_hours, bonus, deductions, status, branch_id, id
      ]
    );

    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const emp = result.rows[0];

    // If employee is a delivery driver, sync branch transfer/updates to drivers table too
    if (emp.name && (emp.role?.includes('طيار') || emp.role?.includes('دليفري') || emp.role?.toLowerCase()?.includes('driver'))) {
      const dCheck = await query(`SELECT id FROM drivers WHERE name = $1 OR phone = $2`, [emp.name, emp.phone || '']);
      if (dCheck.rows && dCheck.rows.length > 0) {
        await query(
          `UPDATE drivers SET name=$1, phone=$2, branch_id=COALESCE($3, branch_id) WHERE id=$4`,
          [emp.name, emp.phone || '', emp.branch_id, dCheck.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO drivers (id, name, phone, status, branch_id)
           VALUES (gen_random_uuid()::TEXT, $1, $2, 'active', $3)`,
          [emp.name, emp.phone || '', emp.branch_id]
        );
      }
    }

    return NextResponse.json(emp);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    // Get employee details before delete
    const empRes = await query('SELECT * FROM employees WHERE id = $1', [id]);
    if (empRes.rows.length > 0) {
      const emp = empRes.rows[0];
      if (emp.name && (emp.role?.includes('طيار') || emp.role?.includes('دليفري'))) {
        await query('DELETE FROM drivers WHERE name = $1 OR phone = $2', [emp.name, emp.phone || '']);
      }
    }
    await query('DELETE FROM employees WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
