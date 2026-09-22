import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id') || 'b1';
    const normalizedBranch = (!branchId || branchId === 'all') ? 'b1' : branchId;

    const res = await query('SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 AS next FROM orders WHERE branch_id = ?', [normalizedBranch]);
    const nextVal = parseInt(res?.rows?.[0]?.next || '1', 10) || 1;

    return NextResponse.json({ next: nextVal });
  } catch (error) {
    console.error('Error fetching next order number:', error);
    return NextResponse.json({ next: 1 });
  }
}
