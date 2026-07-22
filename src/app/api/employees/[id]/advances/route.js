import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      'SELECT * FROM employee_advances WHERE employee_id = $1 ORDER BY created_at DESC',
      [id]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, month, notes } = body;
    const result = await query(
      `INSERT INTO employee_advances (id, employee_id, amount, month, notes)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4) RETURNING *`,
      [id, amount, month, notes]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
