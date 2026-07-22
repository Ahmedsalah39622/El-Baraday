import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, current_order_id } = body;
    const result = await query(
      `UPDATE restaurant_tables SET status=COALESCE($1,status),
       current_order_id=COALESCE($2,current_order_id)
       WHERE id=$3 RETURNING *`,
      [status, current_order_id, id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
