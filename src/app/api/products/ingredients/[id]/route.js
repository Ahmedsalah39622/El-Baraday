import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const quantity = parseFloat(body.quantity || 1);
    const inventoryItemId = body.inventory_item_id || body.inventoryItemId || null;
    const autoDeduct = body.auto_deduct !== undefined ? (body.auto_deduct ? 1 : 0) : null;
    const size = body.size || null;

    const result = await query(
      `UPDATE product_ingredients SET
       quantity = COALESCE($1, quantity),
       inventory_item_id = COALESCE($2, inventory_item_id),
       auto_deduct = COALESCE($3, auto_deduct),
       size = COALESCE($4, size)
       WHERE id = $5 RETURNING *`,
      [quantity, inventoryItemId, autoDeduct, size, id]
    );

    if (result.rows && result.rows.length > 0) {
      return NextResponse.json(result.rows[0]);
    }
    return NextResponse.json({ success: true, id, quantity, auto_deduct: autoDeduct === 1 });
  } catch (error) {
    console.error('Error updating product ingredient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM product_ingredients WHERE id = $1', [id]);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting product ingredient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
