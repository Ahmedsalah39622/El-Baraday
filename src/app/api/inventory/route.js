import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM inventory_items ORDER BY category, name');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, unit, current_stock, min_stock, cost_per_unit, category } = body;
    const result = await query(
      `INSERT INTO inventory_items (id, name, unit, current_stock, min_stock, cost_per_unit, category)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, unit || 'كجم', current_stock || 0, min_stock || 0, cost_per_unit || 0, category]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
