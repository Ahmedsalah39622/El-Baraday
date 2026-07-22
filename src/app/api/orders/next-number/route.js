import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT COALESCE(MAX(order_number), 0) + 1 as next FROM orders');
    return NextResponse.json({ next: result.rows[0].next });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
