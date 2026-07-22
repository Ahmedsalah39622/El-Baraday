import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    return NextResponse.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    const result = await query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
