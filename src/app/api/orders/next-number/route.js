import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query("SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders");
    const nextVal = (result && result.rows && result.rows.length > 0 && result.rows[0].next)
      ? parseInt(result.rows[0].next)
      : 1;
    return NextResponse.json({ next: nextVal });
  } catch (error) {
    return NextResponse.json({ next: 1 });
  }
}
