import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id') || 'b1';
    const normalizedBranch = (!branchId || branchId === 'all') ? 'b1' : branchId;

    let shiftSql = "SELECT id, start_time FROM shifts WHERE status = 'active'";
    const shiftParams = [];
    if (normalizedBranch && normalizedBranch !== 'all') {
      shiftSql += " AND (branch_id = ? OR branch_id IS NULL OR branch_id = '' OR branch_id = 'all')";
      shiftParams.push(normalizedBranch);
    }
    shiftSql += " ORDER BY start_time DESC LIMIT 1";

    const shiftRes = await query(shiftSql, shiftParams);
    const activeShift = shiftRes.rows && shiftRes.rows[0];

    let nextVal = 1;
    if (activeShift) {
      const sql = "SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 AS next FROM orders WHERE branch_id = ? AND (shift_id = ? OR (shift_id IS NULL AND created_at >= ?))";
      const res = await query(sql, [normalizedBranch, activeShift.id, activeShift.start_time]);
      nextVal = parseInt(res?.rows?.[0]?.next || '1', 10) || 1;
    } else {
      const res = await query('SELECT COALESCE(MAX(CAST(order_number AS SIGNED)), 0) + 1 AS next FROM orders WHERE branch_id = ?', [normalizedBranch]);
      nextVal = parseInt(res?.rows?.[0]?.next || '1', 10) || 1;
    }

    return NextResponse.json({ next: nextVal });
  } catch (error) {
    console.error('Error fetching next order number:', error);
    return NextResponse.json({ next: 1 });
  }
}
