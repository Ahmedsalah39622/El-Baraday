import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 50');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cashier_name, start_amount } = body;
    const result = await query(
      `INSERT INTO shifts (id, cashier_name, start_amount, status)
       VALUES (gen_random_uuid()::TEXT, $1, $2, 'active') RETURNING *`,
      [cashier_name, start_amount || 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
