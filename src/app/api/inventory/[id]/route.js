import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, unit, current_stock, min_stock, cost_per_unit, category } = body;
    const result = await query(
      `UPDATE inventory_items SET name=COALESCE($1,name), unit=COALESCE($2,unit),
       current_stock=COALESCE($3,current_stock), min_stock=COALESCE($4,min_stock),
       cost_per_unit=COALESCE($5,cost_per_unit), category=COALESCE($6,category)
       WHERE id=$7 RETURNING *`,
      [name, unit, current_stock, min_stock, cost_per_unit, category, id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM inventory_items WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
