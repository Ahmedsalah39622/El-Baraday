import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 50');
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cashier_name, start_amount, start_time } = body;
    
    // Mark any existing active shifts as closed to ensure only 1 active shift exists in DB
    await query("UPDATE shifts SET status='closed', end_time=CURRENT_TIMESTAMP WHERE status='active'");

    const result = await query(
      `INSERT INTO shifts (id, cashier_name, start_amount, start_time, status)
       VALUES (gen_random_uuid()::TEXT, $1, $2, COALESCE($3::timestamptz, CURRENT_TIMESTAMP), 'active') RETURNING *`,
      [cashier_name || 'administrator', start_amount || 0, start_time || null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('❌ Error creating shift:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
