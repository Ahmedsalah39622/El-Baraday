import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { end_amount, cash_sales, total_orders } = body;
    const result = await query(
      `UPDATE shifts SET end_time=CURRENT_TIMESTAMP, end_amount=$1,
       cash_sales=$2, total_orders=$3, status='closed'
       WHERE id=$4 RETURNING *`,
      [end_amount || 0, cash_sales || 0, total_orders || 0, id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
