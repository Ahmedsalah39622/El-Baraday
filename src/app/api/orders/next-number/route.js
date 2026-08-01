import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id') || 'b1';

    // 1. Find active shift for branch
    let shiftSql = "SELECT start_time FROM shifts WHERE status = 'active'";
    const shiftParams = [];
    if (branchId && branchId !== 'all') {
      shiftSql += " AND (branch_id = $1 OR branch_id IS NULL OR branch_id = '' OR branch_id = 'all')";
      shiftParams.push(branchId);
    }
    shiftSql += " ORDER BY start_time DESC LIMIT 1";

    const shiftRes = await query(shiftSql, shiftParams);
    const activeShift = shiftRes.rows && shiftRes.rows[0];

    let sql = "";
    let params = [];

    if (activeShift && activeShift.start_time) {
      if (branchId && branchId !== 'all') {
        sql = "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE branch_id = $1 AND created_at >= $2";
        params = [branchId, activeShift.start_time];
      } else {
        sql = "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE created_at >= $1";
        params = [activeShift.start_time];
      }
    } else {
      if (branchId && branchId !== 'all') {
        sql = "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE branch_id = $1";
        params = [branchId];
      } else {
        sql = "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders";
        params = [];
      }
    }

    try {
      const res = await query(sql, params);
      const nextVal = (res && res.rows && res.rows.length > 0 && res.rows[0].next)
        ? parseInt(res.rows[0].next)
        : 1;
      return NextResponse.json({ next: nextVal });
    } catch (e) {
      const fbSql = (branchId && branchId !== 'all')
        ? "SELECT order_number FROM orders WHERE branch_id = $1 ORDER BY created_at DESC LIMIT 1"
        : "SELECT order_number FROM orders ORDER BY created_at DESC LIMIT 1";
      const fbParams = (branchId && branchId !== 'all') ? [branchId] : [];
      const fbRes = await query(fbSql, fbParams);
      if (fbRes && fbRes.rows && fbRes.rows.length > 0) {
        return NextResponse.json({ next: (parseInt(fbRes.rows[0].order_number) || 0) + 1 });
      }
      return NextResponse.json({ next: 1 });
    }
  } catch (error) {
    console.error('Error fetching next order number:', error);
    return NextResponse.json({ next: 1 });
  }
}
