import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const sql = `
      SELECT 
        t.*,
        inv.name AS item_name,
        inv.unit AS item_unit
      FROM inventory_transactions t
      LEFT JOIN inventory_items inv ON t.item_id = inv.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
